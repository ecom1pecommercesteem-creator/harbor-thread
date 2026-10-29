import { BATCHES, HOUR, NOW, RESERVOIRS, ZONES, CROP_BY_ID } from '@/data/seed'
import { BOOT_RESERVOIR_LEVEL, BOOT_SCENARIOS } from '@/sim/scenarios'
import { gauss, hashString, mulberry32 } from '@/lib/rng'
import type { Metric, Range, ReservoirLive, SeriesPoint, TimeRange, ZoneLive, Zone } from '@/types'

/** Simulated historical data. Hourly buckets, oldest → newest. Everything is deterministic and derived from the seed. */
const ENV_HOURS = 720
const CONS_HOURS = 2160
const METRICS: Metric[] = ['temperature', 'humidity', 'co2', 'ppfd', 'ph', 'ec']

export type EnvRow = { t: number } & Record<Metric, number>
export interface ResRow { t: number; levelPct: number; ph: number; ec: number; waterTemp: number }
export interface ConsRow { t: number; energy: number; water: number }

const HIST_END = Math.floor(NOW / HOUR) * HOUR
let nextBucket = HIST_END // start of the first bucket not yet in history
export const lightsOnAt = (z: Zone, t: number) => {
  const h = new Date(t).getHours()
  return h >= z.lightsOn[0] && h < z.lightsOn[1]
}

const mid = (r: Range) => (r.min + r.max) / 2
const round = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d

const envByZone = new Map<string, EnvRow[]>()
const resByRes = new Map<string, ResRow[]>()
const consByZone = new Map<string, ConsRow[]>()

for (const z of ZONES) {
  const crop = z.cropProfileId ? CROP_BY_ID.get(z.cropProfileId) : undefined
  const rnd = mulberry32(hashString(`env-${z.id}`))
  if (crop) {
    const rows: EnvRow[] = []
    const ar: Record<Metric, number> = { temperature: 0, humidity: 0, co2: 0, ppfd: 0, ph: 0, ec: 0 }
    for (let i = 0; i < ENV_HOURS; i++) {
      const t = HIST_END - (ENV_HOURS - i) * HOUR
      const on = lightsOnAt(z, t)
      const row = { t } as EnvRow
      for (const m of METRICS) {
        const rg = crop.targets[m]
        const w = rg.max - rg.min
        ar[m] = 0.75 * ar[m] + 0.25 * gauss(rnd) * 0.1 * w
        let v = mid(rg) + ar[m]
        if (m === 'temperature') v += w * (on ? 0.08 : -0.14)
        if (m === 'humidity') v += w * (on ? -0.06 : 0.1)
        if (m === 'co2') v += w * (on ? -0.12 : 0.15)
        if (m === 'ppfd') v = on ? mid(rg) * (1 + gauss(rnd) * 0.015) : 0
        // Scripted boot scenarios ramp in over the last hours so charts match live state.
        for (const s of BOOT_SCENARIOS) {
          if (s.zoneCode === z.code && s.metric === m) {
            const ramp = Math.max(0, 1 - (ENV_HOURS - 1 - i) / 6)
            v += s.offsetWidths * w * ramp
          }
        }
        row[m] = round(v, m === 'ph' || m === 'ec' ? 2 : m === 'co2' || m === 'ppfd' ? 0 : 1)
      }
      rows.push(row)
    }
    envByZone.set(z.id, rows)
  }
  // Consumption: lit hours draw LED + HVAC power; irrigation uptake follows the photoperiod.
  const cons: ConsRow[] = []
  for (let i = 0; i < CONS_HOURS; i++) {
    const t = HIST_END - (CONS_HOURS - i) * HOUR
    if (!crop) {
      cons.push({ t, energy: round(0.004 * z.areaM2 * (0.9 + rnd() * 0.2), 2), water: 0 })
      continue
    }
    const on = lightsOnAt(z, t)
    const n = 0.92 + rnd() * 0.16
    cons.push({
      t,
      energy: round((on ? 0.12 + 0.05 : 0.01 + 0.036) * z.areaM2 * n, 2),
      water: round((on ? 0.16 : 0.064) * z.areaM2 * n, 1),
    })
  }
  consByZone.set(z.id, cons)
}

for (const r of RESERVOIRS) {
  const rnd = mulberry32(hashString(`res-${r.id}`))
  const zs = ZONES.filter((z) => r.zoneIds.includes(z.id) && z.cropProfileId)
  const ph = zs.length ? zs.reduce((a, z) => a + mid(CROP_BY_ID.get(z.cropProfileId!)!.targets.ph), 0) / zs.length : 6
  const ec = zs.length ? zs.reduce((a, z) => a + mid(CROP_BY_ID.get(z.cropProfileId!)!.targets.ec), 0) / zs.length : 1.2
  const rows: ResRow[] = []
  // Level: sawtooth backwards from the boot level (consumption + auto-refill).
  let level = BOOT_RESERVOIR_LEVEL[r.id]
  const levels: number[] = []
  for (let i = 0; i < ENV_HOURS; i++) {
    levels.unshift(level)
    level += 0.55 + rnd() * 0.15
    if (level > 94) level = 14 + rnd() * 8 // went back past a refill
  }
  for (let i = 0; i < ENV_HOURS; i++) {
    const t = HIST_END - (ENV_HOURS - i) * HOUR
    rows.push({
      t,
      levelPct: round(levels[i], 1),
      ph: round(ph + Math.sin(i / 9) * 0.05 + gauss(rnd) * 0.03, 2),
      ec: round(ec + Math.sin(i / 14) * 0.04 + gauss(rnd) * 0.02, 2),
      waterTemp: round(20 + Math.sin((i % 24) / 24 * Math.PI * 2) * 0.6 + gauss(rnd) * 0.15, 1),
    })
  }
  resByRes.set(r.id, rows)
}

/* ------------------------------ Aggregation ------------------------------ */

const RANGE_CFG: Record<TimeRange, { hours: number; bucket: number }> = {
  '24h': { hours: 24, bucket: 1 },
  '7d': { hours: 168, bucket: 4 },
  '30d': { hours: 720, bucket: 24 },
}
export const rangeToDays = (r: TimeRange) => (r === '24h' ? 1 : r === '7d' ? 7 : 30)

/** Chunk from the newest end backwards so the latest bucket is always complete. */
function chunk<T>(rows: T[], hours: number, bucket: number): T[][] {
  const slice = rows.slice(-hours)
  const out: T[][] = []
  for (let end = slice.length; end > 0; end -= bucket) out.unshift(slice.slice(Math.max(0, end - bucket), end))
  return out
}
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

/** Average of one metric across zones. Appends a "now" point from live readings (skipping stale sensors). */
export function envSeries(zoneIds: string[], metric: Metric, range: TimeRange, live?: Record<string, ZoneLive>): SeriesPoint[] {
  const { hours, bucket } = RANGE_CFG[range]
  const lists = zoneIds.map((id) => envByZone.get(id)).filter((x): x is EnvRow[] => !!x)
  if (!lists.length) return []
  const n = lists[0].length
  const merged = Array.from({ length: n }, (_, i) => ({ t: lists[0][i].t, v: avg(lists.map((l) => l[i][metric])) }))
  const pts: SeriesPoint[] = chunk(merged, hours, bucket).map((c) => ({ t: c[c.length - 1].t, value: round(avg(c.map((x) => x.v)), 2) }))
  const liveVals = zoneIds.map((id) => live?.[id]).filter((l): l is ZoneLive => !!l && l.sensorOnline).map((l) => l[metric])
  if (liveVals.length) pts.push({ t: Date.now(), value: round(avg(liveVals), 2) })
  return pts
}

/** All six metrics for one or more zones — handy for multi-line detail charts. */
export function envMulti(zoneIds: string[], range: TimeRange, live?: Record<string, ZoneLive>): SeriesPoint[] {
  const per = METRICS.map((m) => envSeries(zoneIds, m, range, live))
  return (per[0] ?? []).map((p, i) => {
    const row: SeriesPoint = { t: p.t }
    METRICS.forEach((m, k) => (row[m] = per[k][i]?.value ?? NaN))
    return row
  })
}

export function reservoirSeries(resId: string, range: TimeRange, live?: ReservoirLive): SeriesPoint[] {
  const { hours, bucket } = RANGE_CFG[range]
  const rows = resByRes.get(resId) ?? []
  const pts: SeriesPoint[] = chunk(rows, hours, bucket).map((c) => ({
    t: c[c.length - 1].t,
    levelPct: round(avg(c.map((x) => x.levelPct)), 1),
    ph: round(avg(c.map((x) => x.ph)), 2),
    ec: round(avg(c.map((x) => x.ec)), 2),
    waterTemp: round(avg(c.map((x) => x.waterTemp)), 1),
  }))
  if (live) pts.push({ t: Date.now(), levelPct: live.levelPct, ph: live.ph, ec: live.ec, waterTemp: live.waterTemp })
  return pts
}

/** Summed consumption per bucket (kWh or litres) for the given zones. */
export function consumptionSeries(zoneIds: string[], kind: 'energy' | 'water', range: TimeRange): SeriesPoint[] {
  const { hours, bucket } = RANGE_CFG[range]
  return consumptionBuckets(zoneIds, kind, hours, bucket)
}

export function consumptionBuckets(zoneIds: string[], kind: 'energy' | 'water', hours: number, bucket: number): SeriesPoint[] {
  const lists = zoneIds.map((id) => consByZone.get(id)).filter((x): x is ConsRow[] => !!x)
  if (!lists.length) return []
  const merged = lists[0].map((r, i) => ({ t: r.t, v: lists.reduce((a, l) => a + l[i][kind], 0) }))
  return chunk(merged, hours, bucket).map((c) => ({ t: c[c.length - 1].t, value: round(c.reduce((a, x) => a + x.v, 0), 1) }))
}

/** Per-zone totals over the last N days (full hours only). */
export function consumptionByZone(zoneIds: string[], days: number): Record<string, { energy: number; water: number }> {
  const out: Record<string, { energy: number; water: number }> = {}
  for (const id of zoneIds) {
    const rows = (consByZone.get(id) ?? []).slice(-days * 24)
    out[id] = { energy: round(rows.reduce((a, r) => a + r.energy, 0), 1), water: round(rows.reduce((a, r) => a + r.water, 0), 1) }
  }
  return out
}

/** Today's running totals (since local midnight) vs. the same elapsed window yesterday. */
export function todayTotals(zoneIds: string[]) {
  const now = Date.now()
  const midnight = new Date(now).setHours(0, 0, 0, 0)
  const frac = (now - Math.floor(now / HOUR) * HOUR) / HOUR
  const sum = (from: number, to: number, kind: 'energy' | 'water') => {
    let s = 0
    for (const id of zoneIds) for (const r of consByZone.get(id) ?? []) if (r.t >= from && r.t < to) s += r[kind]
    return s
  }
  const curHourStart = Math.floor(now / HOUR) * HOUR
  const partial = (kind: 'energy' | 'water') => {
    let s = 0
    for (const id of zoneIds) {
      const rows = consByZone.get(id) ?? []
      const same = rows.find((r) => r.t === curHourStart - 24 * HOUR)
      if (same) s += same[kind] * frac
    }
    return s
  }
  const res = (kind: 'energy' | 'water') => ({
    today: round(sum(midnight, curHourStart, kind) + partial(kind), 0),
    yesterday: round(sum(midnight - 24 * HOUR, curHourStart - 24 * HOUR, kind) + partial(kind), 0),
  })
  return { energy: res('energy'), water: res('water') }
}

/** Called by the sim once per elapsed hour so charts stay continuous while the app is open. */
export function maybeAppendBucket(now: number, live: Record<string, ZoneLive>, resLive: Record<string, ReservoirLive>): boolean {
  if (now < nextBucket + HOUR) return false
  const t = nextBucket
  nextBucket += HOUR
  for (const [id, rows] of envByZone) {
    const l = live[id]
    if (l) rows.push({ t, temperature: l.temperature, humidity: l.humidity, co2: l.co2, ppfd: l.ppfd, ph: l.ph, ec: l.ec })
  }
  for (const [id, rows] of resByRes) {
    const l = resLive[id]
    if (l) rows.push({ t, levelPct: l.levelPct, ph: l.ph, ec: l.ec, waterTemp: l.waterTemp })
  }
  for (const z of ZONES) {
    const rows = consByZone.get(z.id)
    const last = rows?.[rows.length - 1]
    if (rows && last) rows.push({ ...last, t })
  }
  return true
}

/* -------------------- Irrigation history (derived from water use) -------------------- */

export interface SeedIrrigation { id: string; reservoirId: string; at: string; durationMin: number; volumeL: number; trigger: 'schedule' }
/** One event per 3 h per reservoir for the last 7 days; volume = that reservoir's simulated water consumption over the window. */
export function seedIrrigation(): SeedIrrigation[] {
  const out: SeedIrrigation[] = []
  for (const r of RESERVOIRS) {
    for (let h = 7 * 24; h >= 3; h -= 3) {
      const t = HIST_END - h * HOUR
      let vol = 0
      for (const zid of r.zoneIds) {
        const rows = consByZone.get(zid) ?? []
        for (const row of rows) if (row.t >= t && row.t < t + 3 * HOUR) vol += row.water
      }
      if (vol <= 0) continue
      out.push({ id: `irr-${r.id}-${t}`, reservoirId: r.id, at: new Date(t).toISOString(), durationMin: Math.round(4 + vol / 60), volumeL: Math.round(vol), trigger: 'schedule' })
    }
  }
  return out.sort((a, b) => b.at.localeCompare(a.at))
}

/** Harvest/yield helpers shared by Analytics. */
export const harvestedBatches = () => BATCHES.filter((b) => b.harvestedAt)
