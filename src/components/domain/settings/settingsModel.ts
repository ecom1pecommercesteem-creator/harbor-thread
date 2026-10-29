import { CROP_BY_ID } from '@/data/seed'
import { METRICS } from '@/lib/metrics'
import type { Metric, Range, Settings } from '@/types'

/** Error messages keyed by field path, e.g. "facility.name" or "targets.<cropId>.<metric>.min". */
export type Errors = Record<string, string>

export const BOUNDS: Record<Metric, readonly [number, number]> = {
  temperature: [-5, 50],
  humidity: [0, 100],
  co2: [300, 5000],
  ppfd: [0, 2000],
  ph: [0, 14],
  ec: [0, 10],
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const inRange = (v: number, lo: number, hi: number) => Number.isFinite(v) && v >= lo && v <= hi

/** Structural equality for plain JSON-like settings objects. */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  const ka = Object.keys(a)
  if (ka.length !== Object.keys(b).length) return false
  return ka.every((k) => deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
}

export function validateSettings(d: Settings): Errors {
  const e: Errors = {}
  const name = d.facility.name.trim()
  if (name.length < 2 || name.length > 60) e['facility.name'] = 'Enter a facility name of 2–60 characters.'
  if (!d.facility.city.trim()) e['facility.city'] = 'Enter a city or location.'
  if (!EMAIL.test(d.facility.contact.trim())) e['facility.contact'] = 'Enter a valid email address.'

  for (const [cropId, ranges] of Object.entries(d.targets)) {
    for (const m of METRICS) {
      const r = ranges[m]
      if (!r) continue
      const [lo, hi] = BOUNDS[m]
      const okMin = inRange(r.min, lo, hi)
      const okMax = inRange(r.max, lo, hi)
      if (!okMin) e[`targets.${cropId}.${m}.min`] = `Enter a number from ${lo} to ${hi}.`
      if (!okMax) e[`targets.${cropId}.${m}.max`] = `Enter a number from ${lo} to ${hi}.`
      else if (okMin && r.min >= r.max) e[`targets.${cropId}.${m}.max`] = 'Max must be greater than min.'
    }
  }

  const t = d.thresholds
  if (!inRange(t.criticalMarginPct, 0, 200)) e['thresholds.criticalMarginPct'] = 'Enter a percentage from 0 to 200.'
  if (!inRange(t.reservoirLowPct, 5, 90)) e['thresholds.reservoirLowPct'] = 'Enter a percentage from 5 to 90.'
  if (!inRange(t.reservoirCriticalPct, 1, 89)) e['thresholds.reservoirCriticalPct'] = 'Enter a percentage from 1 to 89.'
  else if (inRange(t.reservoirLowPct, 5, 90) && t.reservoirCriticalPct >= t.reservoirLowPct) e['thresholds.reservoirCriticalPct'] = 'Must be below the low-level warning percentage.'
  if (!inRange(t.maintenanceWarnDays, 0, 90) || !Number.isInteger(t.maintenanceWarnDays)) e['thresholds.maintenanceWarnDays'] = 'Enter a whole number of days from 0 to 90.'
  return e
}

/**
 * Set one bound of a crop/metric override. Stores the full range only while it differs from the
 * crop's demo default; when nothing differs any more, the override is dropped entirely.
 */
export function withTargetValue(targets: Settings['targets'], cropId: string, metric: Metric, side: 'min' | 'max', value: number): Settings['targets'] {
  const def = CROP_BY_ID.get(cropId)!.targets[metric]
  const cur: Range = targets[cropId]?.[metric] ?? def
  const next: Range = { ...cur, [side]: value }
  const crop: Partial<Record<Metric, Range>> = { ...targets[cropId] }
  if (next.min === def.min && next.max === def.max) delete crop[metric]
  else crop[metric] = next
  const rest = Object.fromEntries(Object.entries(targets).filter(([id]) => id !== cropId))
  return Object.keys(crop).length ? { ...rest, [cropId]: crop } : rest
}
