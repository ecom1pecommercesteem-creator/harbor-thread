import { useMemo } from 'react'
import { CROP_BY_ID } from '@/data/seed'
import { classify, effectiveTargets } from '@/sim/rules'
import { useFarm } from '@/store'
import { useZones } from '@/store/hooks'
import type { Range, Reservoir, Settings, Zone } from '@/types'

/** Illustrative fixed water-temperature target (demonstration data, not a crop recipe). */
export const WATER_TEMP_TARGET: Range = { min: 18, max: 22 }

export interface SharedTarget {
  /** min of mins – max of maxes across the fed crops. */
  envelope: Range
  /** max of mins – min of maxes; null when the crops do not overlap. */
  shared: Range | null
  /** What readings are judged against: the shared recipe, or the envelope as a compromise. */
  target: Range
}

export function sharedTarget(cropIds: string[], settings: Settings, metric: 'ph' | 'ec'): SharedTarget | null {
  if (!cropIds.length) return null
  const ranges = cropIds.map((id) => effectiveTargets(id, settings)[metric])
  const envelope = { min: Math.min(...ranges.map((r) => r.min)), max: Math.max(...ranges.map((r) => r.max)) }
  const lo = Math.max(...ranges.map((r) => r.min))
  const hi = Math.min(...ranges.map((r) => r.max))
  const shared = lo <= hi ? { min: lo, max: hi } : null
  return { envelope, shared, target: shared ?? envelope }
}

export interface Delta {
  state: 'ok' | 'warning' | 'critical'
  text: string
}

/** "+0.15 above range", "-0.10 below range" or "within range", using the shared classify() rule. */
export function describeDelta(value: number, range: Range, criticalMarginPct: number, decimals: number, unit = ''): Delta {
  const c = classify(value, range, criticalMarginPct)
  if (!c.side) return { state: c.state, text: 'within range' }
  const d = c.side === 'high' ? value - range.max : range.min - value
  const sign = c.side === 'high' ? '+' : '-'
  return { state: c.state, text: `${sign}${d.toFixed(decimals)}${unit ? ` ${unit}` : ''} ${c.side} range` }
}

export interface ReservoirContext {
  /** All zones wired to this reservoir (active and idle). */
  fed: Zone[]
  /** Zones with a crop planted. */
  active: Zone[]
  cropNames: string[]
  ph: SharedTarget | null
  ec: SharedTarget | null
  /** Every active zone feeding this reservoir has an offline sensor, so pH/EC are last known values. */
  allSensorsOffline: boolean
}

export function useReservoirContext(res: Reservoir): ReservoirContext {
  const zones = useZones()
  const settings = useFarm((s) => s.settings)
  const live = useFarm((s) => s.live)
  return useMemo(() => {
    const fed = zones.filter((z) => res.zoneIds.includes(z.id))
    const active = fed.filter((z) => z.cropProfileId)
    const cropIds = [...new Set(active.flatMap((z) => (z.cropProfileId ? [z.cropProfileId] : [])))]
    return {
      fed,
      active,
      cropNames: cropIds.map((id) => CROP_BY_ID.get(id)?.name ?? id),
      ph: sharedTarget(cropIds, settings, 'ph'),
      ec: sharedTarget(cropIds, settings, 'ec'),
      allSensorsOffline: active.length > 0 && active.every((z) => live[z.id]?.sensorOnline !== true),
    }
  }, [zones, res, settings, live])
}
