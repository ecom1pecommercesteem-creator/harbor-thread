import { ZONE_BY_ID } from '@/data/seed'
import type { Fmt } from '@/lib/format'
import { METRICS, METRIC_META, USER } from '@/lib/metrics'
import { effectiveTargets } from '@/sim/rules'
import type { Alert, AlertStatus, Metric, Range, Settings, Severity } from '@/types'

export type TabId = 'all' | 'critical' | 'warning' | 'info' | 'acknowledged' | 'resolved'
export const TABS: readonly { id: TabId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'critical', label: 'Critical' },
  { id: 'warning', label: 'Warnings' },
  { id: 'info', label: 'Informational' },
  { id: 'acknowledged', label: 'Acknowledged' },
  { id: 'resolved', label: 'Resolved' },
]

export type KindFilter = 'all' | Alert['assetKind']
export type StatusFilter = 'all' | AlertStatus
export type SortKey = 'newest' | 'oldest' | 'severity'

export const KIND_OPTIONS: readonly { value: KindFilter; label: string }[] = [
  { value: 'all', label: 'All assets' },
  { value: 'zone', label: 'Zones' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'reservoir', label: 'Reservoirs' },
]
export const STATUS_OPTIONS: readonly { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Any status' },
  { value: 'active', label: 'Active' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'resolved', label: 'Resolved' },
]
export const SORT_OPTIONS: readonly { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'severity', label: 'Severity' },
]

const SEV_RANK: Record<Severity, number> = { critical: 0, warning: 1, info: 2 }
export const ASSET_KIND_LABEL: Record<Alert['assetKind'], string> = { zone: 'Zone', equipment: 'Equipment', reservoir: 'Reservoir' }

export const isMetric = (m: unknown): m is Metric => (METRICS as readonly unknown[]).includes(m)

export function matchesTab(a: Alert, tab: TabId): boolean {
  if (tab === 'all') return true
  if (tab === 'acknowledged' || tab === 'resolved') return a.status === tab
  // Severity tabs only count open (non-resolved) alerts.
  return a.status !== 'resolved' && a.severity === tab
}

export function matchesQuery(a: Alert, q: string): boolean {
  const s = q.trim().toLowerCase()
  if (!s) return true
  return [a.title, a.description, a.assetLabel, a.ruleKey ?? ''].some((v) => v.toLowerCase().includes(s))
}

export function sortAlerts(list: readonly Alert[], key: SortKey): Alert[] {
  const newestFirst = (x: Alert, y: Alert) => y.createdAt.localeCompare(x.createdAt)
  const cmp =
    key === 'oldest' ? (x: Alert, y: Alert) => -newestFirst(x, y)
    : key === 'severity' ? (x: Alert, y: Alert) => SEV_RANK[x.severity] - SEV_RANK[y.severity] || newestFirst(x, y)
    : newestFirst
  return [...list].sort(cmp)
}

export function assetHref(a: Alert): string {
  const id = encodeURIComponent(a.assetId)
  if (a.assetKind === 'zone') return `/zones?zone=${id}`
  if (a.assetKind === 'equipment') return `/equipment?eq=${id}`
  return `/water?res=${id}`
}

/** Acceptable band for the alert's asset: zone metric target (current settings) or reservoir low-level line. */
export function alertBand(a: Alert, settings: Settings): Range | null {
  if (a.assetKind === 'reservoir') return a.metric === 'level' ? { min: settings.thresholds.reservoirLowPct, max: 100 } : null
  if (a.assetKind !== 'zone' || !isMetric(a.metric)) return null
  const z = ZONE_BY_ID.get(a.assetId)
  if (!z?.cropProfileId) return null
  return effectiveTargets(z.cropProfileId, settings)[a.metric]
}

export interface Measure {
  /** Measured value, display text with unit. */
  value: string
  numeric: number
  /** Band in display units (converted for temperature). */
  band: Range | null
  /** Target / threshold text, display units. */
  target: string | null
}

export function measureOf(a: Alert, band: Range | null, fmt: Fmt): Measure | null {
  if (a.value === undefined) return null
  const isTemp = a.metric === 'temperature'
  const conv = (v: number) => (isTemp ? fmt.tempVal(v) : v)
  const unit = isTemp ? fmt.tempUnit : (a.unit ?? '')
  const decimals = isMetric(a.metric) ? METRIC_META[a.metric].decimals : 0
  const fixed = (v: number) => v.toFixed(decimals)
  const bandText = band ? `${fixed(conv(band.min))}–${fixed(conv(band.max))} ${unit}`.trim() : null
  // Temperature thresholds are stored in °C text, so the converted live band is used for them instead.
  const target = isTemp || !a.threshold ? bandText : `${a.threshold}${a.unit ? ` ${a.unit}` : ''}`
  return {
    value: `${fixed(conv(a.value))} ${unit}`.trim(),
    numeric: conv(a.value),
    band: band ? { min: conv(band.min), max: conv(band.max) } : null,
    target,
  }
}

/** One-line who/when summary for the status. */
export function statusSummary(a: Alert, fmt: Fmt): string {
  const at = (t?: string) => (t ? ` · ${fmt.dateTime(t)}` : '')
  if (a.status === 'resolved') {
    return a.resolvedBy === 'system'
      ? `Resolved automatically — condition cleared${at(a.resolvedAt)}`
      : `Resolved by ${USER.name}${at(a.resolvedAt)}`
  }
  if (a.status === 'acknowledged') return `Acknowledged by ${a.acknowledgedBy ?? 'operator'}${at(a.acknowledgedAt)}`
  return 'Awaiting acknowledgement'
}
