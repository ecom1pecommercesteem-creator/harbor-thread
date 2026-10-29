import { HOUR, RESERVOIRS, ZONES, iso } from '@/data/seed'
import { lightsOnAt } from '@/data/history'
import { gauss, mulberry32 } from '@/lib/rng'
import { METRICS } from '@/lib/metrics'
import { effectiveTargets } from '@/sim/rules'
import { BOOT_RESERVOIR_LEVEL, BOOT_SCENARIOS } from '@/sim/scenarios'
import type { IrrigationEvent, Metric, ReservoirLive, Settings, Zone, ZoneLive } from '@/types'

/**
 * Simulation service. Readings follow a mean-reverting walk around crop-specific targets (gradual drift,
 * no per-tick randomness explosion). Occasional "events" pull one metric away from target for a while;
 * rare sensor dropouts freeze a zone's readings (stale) until the node reconnects.
 */
const K = 0.15 // pull strength toward the mean per tick
const rnd = mulberry32(Date.now() & 0xffffffff)

interface Pull { offsetWidths: number; ticks: number }
const pulls = new Map<string, Pull>() // `${zoneId}:${metric}`
const offlineTicks = new Map<string, number>()
const resNoise = new Map<string, number>()
let tickCount = 0
let lastTick = Date.now()
let nextScheduleBoundary = Math.ceil(Date.now() / (3 * HOUR)) * 3 * HOUR

const ACTIVE = ZONES.filter((z) => z.cropProfileId)
const DECIMALS: Record<Metric, number> = { temperature: 1, humidity: 1, co2: 0, ppfd: 0, ph: 2, ec: 2 }
const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d

function mu(zone: Zone, metric: Metric, settings: Settings, on: boolean): number {
  const r = effectiveTargets(zone.cropProfileId!, settings)[metric]
  const w = r.max - r.min
  let m = (r.min + r.max) / 2
  if (metric === 'temperature') m += w * (on ? 0.08 : -0.14)
  if (metric === 'humidity') m += w * (on ? -0.06 : 0.1)
  if (metric === 'co2') m += w * (on ? -0.12 : 0.15)
  if (metric === 'ppfd') m = on ? m : 0
  return m + (pulls.get(`${zone.id}:${metric}`)?.offsetWidths ?? 0) * w
}

export interface SimState {
  live: Record<string, ZoneLive>
  resLive: Record<string, ReservoirLive>
}

export function initSim(settings: Settings, now = Date.now()): SimState {
  pulls.clear()
  offlineTicks.clear()
  for (const s of BOOT_SCENARIOS) pulls.set(`z-${s.zoneCode.toLowerCase()}:${s.metric}`, { offsetWidths: s.offsetWidths, ticks: s.ticks })
  const live: Record<string, ZoneLive> = {}
  for (const z of ACTIVE) {
    const on = lightsOnAt(z, now)
    const l = { zoneId: z.id, sensorOnline: true, updatedAt: now, lightsOn: on } as ZoneLive
    for (const m of METRICS) l[m] = round(mu(z, m, settings, on), DECIMALS[m])
    live[z.id] = l
  }
  return { live, resLive: reservoirsFrom(live, {}, now, true) }
}

function reservoirsFrom(live: Record<string, ZoneLive>, prev: Record<string, ReservoirLive>, now: number, boot = false): Record<string, ReservoirLive> {
  const out: Record<string, ReservoirLive> = {}
  for (const r of RESERVOIRS) {
    const zs = r.zoneIds.map((id) => live[id]).filter((l): l is ZoneLive => !!l && l.sensorOnline)
    const p = prev[r.id]
    const avg = (k: 'ph' | 'ec') => (zs.length ? zs.reduce((a, l) => a + l[k], 0) / zs.length : p?.[k] ?? 0)
    const n = (resNoise.get(r.id) ?? 0) * 0.8 + gauss(rnd) * 0.05
    resNoise.set(r.id, n)
    out[r.id] = {
      reservoirId: r.id,
      levelPct: p?.levelPct ?? BOOT_RESERVOIR_LEVEL[r.id],
      ph: round(avg('ph'), 2),
      ec: round(avg('ec'), 2),
      waterTemp: round(20 + Math.sin((new Date(now).getHours() / 24) * Math.PI * 2) * 0.6 + n, 1),
      pump: boot ? 'idle' : p.pump,
      updatedAt: now,
    }
  }
  return out
}

export interface StepResult extends SimState {
  irrigation: IrrigationEvent[]
}

/** Advance the simulation one tick. Pure with respect to inputs except for module-level event state. */
export function stepSim(prev: SimState, settings: Settings, now = Date.now()): StepResult {
  tickCount++
  const dt = Math.min(60, (now - lastTick) / 1000)
  lastTick = now
  const live: Record<string, ZoneLive> = {}

  // Rare scripted-by-chance events: pull one metric off target for a while.
  if (rnd() < 0.012) {
    const z = ACTIVE[Math.floor(rnd() * ACTIVE.length)]
    const m = (['temperature', 'humidity', 'co2', 'ph', 'ec'] as const)[Math.floor(rnd() * 5)]
    const key = `${z.id}:${m}`
    if (!pulls.has(key)) pulls.set(key, { offsetWidths: (rnd() < 0.5 ? -1 : 1) * (0.6 + rnd() * 0.7), ticks: 20 + Math.floor(rnd() * 30) })
  }
  for (const [k, p] of pulls) if (--p.ticks <= 0) pulls.delete(k)

  // Rare sensor dropouts (max two at once).
  const offlineNow = [...offlineTicks.keys()].length
  if (offlineNow < 2 && rnd() < 0.015) {
    const z = ACTIVE[Math.floor(rnd() * ACTIVE.length)]
    if (!offlineTicks.has(z.id)) offlineTicks.set(z.id, 8 + Math.floor(rnd() * 8))
  }

  for (const z of ACTIVE) {
    const p = prev.live[z.id]
    const on = lightsOnAt(z, now)
    const left = offlineTicks.get(z.id)
    if (left !== undefined) {
      if (left <= 1) offlineTicks.delete(z.id)
      else offlineTicks.set(z.id, left - 1)
      if (left > 1) {
        live[z.id] = { ...p, sensorOnline: false, lightsOn: on } // values + updatedAt frozen → stale
        continue
      }
    }
    const next = { ...p, sensorOnline: true, updatedAt: now, lightsOn: on }
    for (const m of METRICS) {
      const r = effectiveTargets(z.cropProfileId!, settings)[m]
      const w = r.max - r.min
      const target = mu(z, m, settings, on)
      const v = m === 'ppfd' ? (on ? target * (1 + gauss(rnd) * 0.008) : 0) : p[m] + K * (target - p[m]) + gauss(rnd) * w * 0.012
      next[m] = round(Math.max(0, v), DECIMALS[m])
    }
    live[z.id] = next
  }

  const resLive = reservoirsFrom(live, prev.resLive, now)
  const irrigation: IrrigationEvent[] = []
  const boundary = now >= nextScheduleBoundary
  if (boundary) nextScheduleBoundary += 3 * HOUR
  for (const r of RESERVOIRS) {
    const cur = resLive[r.id]
    cur.levelPct = prev.resLive[r.id].levelPct - 0.000161 * dt // ≈ 0.58 %/h
    // Recirculation duty cycle: pump shows "running" 8 of every 24 ticks.
    cur.pump = prev.resLive[r.id].pump === 'fault' ? 'fault' : (tickCount + r.id.length * 5) % 24 < 8 ? 'running' : 'idle'
    if (boundary) {
      const vol = Math.round(r.zoneIds.reduce((a, id) => a + (live[id] ? (live[id].lightsOn ? 0.48 : 0.19) * ZONES.find((z) => z.id === id)!.areaM2 : 0), 0))
      if (vol > 0) irrigation.push({ id: `irr-${r.id}-${now}`, reservoirId: r.id, at: iso(now), durationMin: Math.round(4 + vol / 60), volumeL: vol, trigger: 'schedule' })
    }
    if (cur.levelPct <= 10) {
      cur.levelPct = 92
      irrigation.push({ id: `irr-${r.id}-refill-${now}`, reservoirId: r.id, at: iso(now), durationMin: 18, volumeL: Math.round(r.capacityL * 0.82), trigger: 'auto-refill' })
    }
    cur.levelPct = round(cur.levelPct, 2)
  }
  return { live, resLive, irrigation }
}
