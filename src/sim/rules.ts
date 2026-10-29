import { CROP_BY_ID, ZONE_BY_ID, RESERVOIR_BY_ID } from '@/data/seed'
import { METRIC_META, METRICS } from '@/lib/metrics'
import type { Alert, Batch, Equipment, HealthStatus, Metric, Range, ReservoirLive, Settings, Severity, Zone, ZoneLive } from '@/types'

/** Effective target ranges for a crop: user overrides (Settings) win over demo defaults. */
export function effectiveTargets(cropId: string, settings: Settings): Record<Metric, Range> {
  const base = CROP_BY_ID.get(cropId)!.targets
  const o = settings.targets[cropId] ?? {}
  return Object.fromEntries(METRICS.map((m) => [m, o[m] ?? base[m]])) as Record<Metric, Range>
}

export interface Breach {
  metric: Metric
  severity: Severity
  side: 'low' | 'high'
  value: number
  range: Range
}

export function classify(value: number, range: Range, criticalMarginPct: number): { state: 'ok' | 'warning' | 'critical'; side: 'low' | 'high' | null } {
  const w = range.max - range.min
  const crit = (criticalMarginPct / 100) * w
  if (value < range.min) return { state: range.min - value > crit ? 'critical' : 'warning', side: 'low' }
  if (value > range.max) return { state: value - range.max > crit ? 'critical' : 'warning', side: 'high' }
  return { state: 'ok', side: null }
}

export function zoneBreaches(zone: Zone, live: ZoneLive | undefined, settings: Settings): Breach[] {
  if (!zone.cropProfileId || !live || !live.sensorOnline) return []
  const targets = effectiveTargets(zone.cropProfileId, settings)
  const out: Breach[] = []
  for (const metric of METRICS) {
    if (metric === 'ppfd' && !live.lightsOn) continue
    const c = classify(live[metric], targets[metric], settings.thresholds.criticalMarginPct)
    if (c.state !== 'ok' && c.side) out.push({ metric, severity: c.state, side: c.side, value: live[metric], range: targets[metric] })
  }
  return out
}

/** Zone health: inactive → offline, stale sensor → warning, else worst breach. */
export function zoneHealth(zone: Zone, live: ZoneLive | undefined, settings: Settings): HealthStatus {
  if (!zone.cropProfileId) return 'offline'
  if (!live || !live.sensorOnline) return 'warning'
  const b = zoneBreaches(zone, live, settings)
  if (b.some((x) => x.severity === 'critical')) return 'critical'
  return b.length ? 'warning' : 'operational'
}

export const batchStatus = (b: Batch, health: HealthStatus): 'healthy' | 'attention' | 'at-risk' | 'harvested' =>
  b.harvestedAt ? 'harvested' : health === 'critical' ? 'at-risk' : health === 'warning' ? 'attention' : 'healthy'

export const fmtRange = (r: Range, unit: string, decimals = 0) => `${r.min.toFixed(decimals)}–${r.max.toFixed(decimals)}${unit ? ' ' + unit : ''}`

/* ---------------------------- Alert evaluation ---------------------------- */

export interface Candidate extends Pick<Alert, 'ruleKey' | 'severity' | 'title' | 'description' | 'assetKind' | 'assetId' | 'assetLabel' | 'facilityId' | 'metric' | 'value' | 'threshold' | 'unit'> {
  ruleKey: string
}

export interface EvalCtx {
  zones: Zone[]
  live: Record<string, ZoneLive>
  resLive: Record<string, ReservoirLive>
  equipment: Equipment[]
  batches: Batch[]
  settings: Settings
  now: number
}

export function evaluateRules(ctx: EvalCtx): Candidate[] {
  const { settings, now } = ctx
  const out: Candidate[] = []
  for (const z of ctx.zones) {
    if (!z.cropProfileId) continue
    const crop = CROP_BY_ID.get(z.cropProfileId)!
    const live = ctx.live[z.id]
    if (live && !live.sensorOnline) {
      out.push({
        ruleKey: `${z.id}:sensor:offline`, severity: 'warning', title: `Sensor node offline in Zone ${z.code}`,
        description: `No fresh readings from Zone ${z.code} since ${new Date(live.updatedAt).toLocaleTimeString()}. Displayed values are stale.`,
        assetKind: 'zone', assetId: z.id, assetLabel: `Zone ${z.code}`, facilityId: z.facilityId, metric: 'sensor', threshold: 'Heartbeat every 5 s',
      })
    }
    for (const b of zoneBreaches(z, live, settings)) {
      const m = METRIC_META[b.metric]
      out.push({
        ruleKey: `${z.id}:${b.metric}:${b.side}`, severity: b.severity,
        title: `${m.label} ${b.side === 'high' ? 'above' : 'below'} target in Zone ${z.code}`,
        description: `${m.label} is ${b.value.toFixed(m.decimals)}${m.unit ? ' ' + m.unit : ''}, ${b.side === 'high' ? 'above' : 'below'} the ${crop.name} target of ${fmtRange(b.range, m.unit, m.decimals)}.`,
        assetKind: 'zone', assetId: z.id, assetLabel: `Zone ${z.code}`, facilityId: z.facilityId, metric: b.metric,
        value: b.value, threshold: `${fmtRange(b.range, '', m.decimals)}`, unit: m.unit,
      })
    }
  }
  for (const [rid, rl] of Object.entries(ctx.resLive)) {
    const res = RESERVOIR_BY_ID.get(rid)!
    const { reservoirLowPct: low, reservoirCriticalPct: crit } = settings.thresholds
    if (rl.levelPct < low) {
      out.push({
        ruleKey: `${rid}:level:low`, severity: rl.levelPct < crit ? 'critical' : 'warning', title: `Low water level in ${res.name.split(' · ')[0]}`,
        description: `Reservoir level is ${rl.levelPct.toFixed(0)} %, below the ${low} % low-level threshold. Auto-refill engages at 10 %.`,
        assetKind: 'reservoir', assetId: rid, assetLabel: res.name.split(' · ')[0], facilityId: res.facilityId, metric: 'level',
        value: rl.levelPct, threshold: `≥ ${low}`, unit: '%',
      })
    }
  }
  for (const e of ctx.equipment) {
    if (e.type === 'sensor' || (e.type === 'light' && e.zoneId && !ZONE_BY_ID.get(e.zoneId)?.cropProfileId)) continue
    if (e.status === 'warning' || e.status === 'critical' || e.status === 'offline') {
      const fault = e.faults[0]
      out.push({
        ruleKey: `${e.id}:status`, severity: e.status === 'critical' ? 'critical' : 'warning',
        title: `${e.name} ${e.status === 'offline' ? 'offline' : e.status === 'critical' ? 'critical fault' : 'degraded'}`,
        description: fault ? `${fault.code}: ${fault.message}.` : `${e.name} reported status "${e.status}".`,
        assetKind: 'equipment', assetId: e.id, assetLabel: e.name, facilityId: e.facilityId, metric: undefined,
      })
    }
    const due = new Date(e.maintenanceDue).getTime()
    const daysLeft = (due - now) / 86_400_000
    if (daysLeft <= settings.thresholds.maintenanceWarnDays) {
      out.push({
        ruleKey: `${e.id}:maintenance`, severity: daysLeft < 0 ? 'warning' : 'info', metric: 'maintenance',
        title: daysLeft < 0 ? `Maintenance overdue: ${e.name}` : `Maintenance due soon: ${e.name}`,
        description: daysLeft < 0 ? `Scheduled service was due ${Math.ceil(-daysLeft)} day(s) ago.` : `Scheduled service due in ${Math.ceil(daysLeft)} day(s).`,
        assetKind: 'equipment', assetId: e.id, assetLabel: e.name, facilityId: e.facilityId,
        threshold: `Due ${new Date(due).toLocaleDateString()}`,
      })
    }
  }
  for (const b of ctx.batches) {
    if (b.harvestedAt) continue
    const z = ZONE_BY_ID.get(b.zoneId)!
    if (new Date(b.harvestEta).getTime() <= now) {
      out.push({
        ruleKey: `${b.id}:ready`, severity: 'info', title: `Batch ${b.id} is ready to harvest`,
        description: `${CROP_BY_ID.get(b.cropProfileId)!.name} in Zone ${z.code} has reached its estimated harvest date.`,
        assetKind: 'zone', assetId: z.id, assetLabel: `Zone ${z.code}`, facilityId: z.facilityId,
      })
    }
  }
  return out
}

const SEV_RANK: Record<Severity, number> = { info: 0, warning: 1, critical: 2 }
let seq = 0
export const newAlertId = () => `al-${Date.now().toString(36)}${(seq++).toString(36)}`

export interface ReconcileResult {
  alerts: Alert[]
  suppressed: string[]
  created: Alert[]
}

/**
 * Merge freshly evaluated candidates into existing alerts, preserving ack/resolve state:
 *  - new breach → new alert (unless the user resolved that key while it was still breaching)
 *  - existing open alert → refresh value, escalate severity (never silently downgrade ack state)
 *  - breach cleared → auto-resolve open rule alerts
 */
export function reconcile(
  alerts: Alert[],
  candidates: Candidate[],
  suppressed: string[],
  now: number,
  backdate?: (c: Candidate) => number,
): ReconcileResult {
  const open = new Map<string, Alert>()
  for (const a of alerts) if (a.ruleKey && a.status !== 'resolved') open.set(a.ruleKey, a)
  const active = new Set(candidates.map((c) => c.ruleKey))
  const sup = new Set(suppressed.filter((k) => active.has(k)))
  const created: Alert[] = []
  const next = alerts.map((a) => {
    if (!a.ruleKey || a.status === 'resolved') return a
    const c = candidates.find((x) => x.ruleKey === a.ruleKey)
    if (!c) return { ...a, status: 'resolved' as const, resolvedAt: new Date(now).toISOString(), resolvedBy: 'system' as const, read: true }
    const escalated = SEV_RANK[c.severity] > SEV_RANK[a.severity]
    return { ...a, value: c.value ?? a.value, description: c.description, severity: escalated ? c.severity : a.severity, read: escalated ? false : a.read }
  })
  for (const c of candidates) {
    if (open.has(c.ruleKey) || sup.has(c.ruleKey)) continue
    const a: Alert = {
      ...c, id: newAlertId(), createdAt: new Date(now - (backdate?.(c) ?? 0)).toISOString(), status: 'active', read: false,
    }
    created.push(a)
    next.unshift(a)
  }
  return { alerts: next, suppressed: [...sup], created }
}
