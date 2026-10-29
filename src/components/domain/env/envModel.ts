import { CROP_BY_ID } from '@/data/seed'
import type { Fmt } from '@/lib/format'
import { METRIC_META } from '@/lib/metrics'
import { classify, effectiveTargets } from '@/sim/rules'
import type { Metric, Range, Settings, Zone, ZoneLive } from '@/types'

/** A zone with a crop assigned (idle zones have no sensors reporting). */
export type ActiveZone = Zone & { cropProfileId: string }
export type Verdict = 'ok' | 'warning' | 'critical'

export const ENV_METRICS: Metric[] = ['temperature', 'humidity', 'co2', 'ppfd']
export const TABLE_METRICS: Metric[] = ['temperature', 'humidity', 'co2', 'ppfd', 'ph', 'ec']

export const activeZonesOf = (zones: Zone[]): ActiveZone[] => zones.filter((z): z is ActiveZone => z.cropProfileId !== null)
export const cropName = (id: string) => CROP_BY_ID.get(id)?.name ?? id

/** Verdict plus signed distance outside the band, in the metric's raw unit. */
export function judge(value: number, range: Range, settings: Settings): { state: Verdict; side: 'low' | 'high' | null; delta: number } {
  const c = classify(value, range, settings.thresholds.criticalMarginPct)
  const delta = c.side === 'high' ? value - range.max : c.side === 'low' ? range.min - value : 0
  return { state: c.state, side: c.side, delta }
}

/** Temperatures follow the Settings unit; other metrics are unchanged. */
export const toDisplay = (m: Metric, v: number, f: Fmt) => (m === 'temperature' ? f.tempVal(v) : v)
export const unitOf = (m: Metric, f: Fmt) => (m === 'temperature' ? f.tempUnit : METRIC_META[m].unit)
export const fmtMetric = (m: Metric, v: number, f: Fmt) => toDisplay(m, v, f).toFixed(METRIC_META[m].decimals)
export const fmtRange = (m: Metric, r: Range, f: Fmt) => `${fmtMetric(m, r.min, f)}–${fmtMetric(m, r.max, f)} ${unitOf(m, f)}`.trim()

/** Position inside the target band on a scale that pads half a band width each side (band = middle half). */
export function bandPosition(v: number, r: Range): number {
  const w = r.max - r.min || 1
  return Math.min(1, Math.max(0, (v - (r.min - w / 2)) / (2 * w)))
}

function deltaText(m: Metric, j: { side: 'low' | 'high' | null; delta: number }, f: Fmt): string | null {
  if (!j.side) return null
  // Deltas are differences, so convert via the offset difference, not the absolute conversion.
  const d = m === 'temperature' ? f.tempVal(j.delta) - f.tempVal(0) : j.delta
  return `${j.side === 'high' ? '+' : '−'}${d.toFixed(METRIC_META[m].decimals)} ${unitOf(m, f)} ${j.side === 'high' ? 'above' : 'below'} target`
}

export interface MetricCard {
  metric: Metric
  label: string
  unit: string
  value: string | null
  stale: boolean
  lightsOff: boolean
  noData: boolean
  verdict: Verdict | null
  /** Single zone: signed delta vs target. All zones: how many reporting zones are out of range. */
  detail: string | null
  note: string | null
  targetText: string
  /** 0–1 position inside the scale; null when not applicable (All zones, stale, lights off). */
  position: number | null
}

function blank(m: Metric, f: Fmt): MetricCard {
  return { metric: m, label: METRIC_META[m].label, unit: unitOf(m, f), value: null, stale: false, lightsOff: false, noData: false, verdict: null, detail: null, note: null, targetText: '', position: null }
}

function singleCard(m: Metric, zone: ActiveZone, l: ZoneLive | undefined, settings: Settings, f: Fmt): MetricCard {
  const range = effectiveTargets(zone.cropProfileId, settings)[m]
  const card = { ...blank(m, f), targetText: `Target ${fmtRange(m, range, f)} for ${cropName(zone.cropProfileId)}` }
  if (!l) return { ...card, noData: true, note: 'No sensor data for this zone' }
  if (m === 'ppfd' && !l.lightsOn) return { ...card, lightsOff: true, note: 'PPFD is only evaluated while lights are on' }
  const value = fmtMetric(m, l[m], f)
  if (!l.sensorOnline) return { ...card, value, stale: true, note: 'No fresh data — showing last known values' }
  const j = judge(l[m], range, settings)
  return { ...card, value, verdict: j.state, detail: deltaText(m, j, f), position: bandPosition(l[m], range) }
}

function allCard(m: Metric, zones: ActiveZone[], live: Record<string, ZoneLive>, settings: Settings, f: Fmt): MetricCard {
  const ranges = zones.map((z) => effectiveTargets(z.cropProfileId, settings)[m])
  const lo = Math.min(...ranges.map((r) => r.min))
  const hi = Math.max(...ranges.map((r) => r.max))
  const card = { ...blank(m, f), targetText: `Targets vary by crop: ${fmtRange(m, { min: lo, max: hi }, f)} (crop-specific)` }

  const online = zones.flatMap((zone) => {
    const l = live[zone.id] as ZoneLive | undefined
    return l?.sensorOnline ? [{ zone, l }] : []
  })
  const offline = zones.length - online.length
  if (!online.length) return { ...card, noData: true, note: 'No fresh data from any zone sensor' }
  const lit = m === 'ppfd' ? online.filter((x) => x.l.lightsOn) : online
  if (!lit.length) return { ...card, lightsOff: true, note: 'PPFD is only evaluated while lights are on' }

  const avg = lit.reduce((a, x) => a + x.l[m], 0) / lit.length
  const out = lit.map(({ zone, l }) => judge(l[m], effectiveTargets(zone.cropProfileId, settings)[m], settings)).filter((j) => j.state !== 'ok')
  const verdict: Verdict = out.some((j) => j.state === 'critical') ? 'critical' : out.length ? 'warning' : 'ok'
  const detail = out.length ? `${out.length} of ${lit.length} reporting zones out of range` : `All ${lit.length} reporting zones within target`
  const note = offline ? `Averaged over reporting zones; ${offline} sensor${offline > 1 ? 's' : ''} offline and excluded` : 'Averaged over reporting zones'
  return { ...card, value: fmtMetric(m, avg, f), verdict, detail, note }
}

/** Current-reading cards: one zone (its live value) or all active zones (average of online zones). */
export function buildCards(scope: ActiveZone | null, active: ActiveZone[], live: Record<string, ZoneLive>, settings: Settings, f: Fmt): MetricCard[] {
  return ENV_METRICS.map((m) => (scope ? singleCard(m, scope, live[scope.id] as ZoneLive | undefined, settings, f) : allCard(m, active, live, settings, f)))
}

export interface Cell {
  text: string
  stale: boolean
  off: boolean
  verdict: Verdict
  arrow: '↑' | '↓' | null
}

/** One table cell for a zone metric. Stale sensors keep their last value but are flagged, not judged. */
export function cellFor(zone: ActiveZone, l: ZoneLive | undefined, m: Metric, settings: Settings, f: Fmt): Cell {
  const none: Cell = { text: '—', stale: false, off: false, verdict: 'ok', arrow: null }
  if (!l) return none
  if (m === 'ppfd' && !l.lightsOn) return { ...none, text: '', off: true }
  if (!l.sensorOnline) return { ...none, text: `${fmtMetric(m, l[m], f)} ${unitOf(m, f)}`.trim(), stale: true }
  const j = judge(l[m], effectiveTargets(zone.cropProfileId, settings)[m], settings)
  return { text: fmtMetric(m, l[m], f), stale: false, off: false, verdict: j.state, arrow: j.side === 'high' ? '↑' : j.side === 'low' ? '↓' : null }
}
