import { format } from 'date-fns'
import { between, hashString, mulberry32, pick } from '@/lib/rng'
import type {
  Batch,
  BatchStage,
  CropProfile,
  Equipment,
  EquipmentType,
  Facility,
  Fault,
  HealthStatus,
  Reservoir,
  StatusEvent,
  Zone,
} from '@/types'

export const DAY = 86_400_000
export const HOUR = 3_600_000
/** Boot time. All seeded timestamps are relative to this so the demo always looks "live". */
export const NOW = Date.now()
export const iso = (t: number) => new Date(t).toISOString()

export const FACILITIES: Facility[] = [
  { id: 'fac-aurora', name: 'Aurora Vertical Farm', city: 'Rotterdam, NL', areaM2: 1840, timezone: 'Europe/Amsterdam' },
  { id: 'fac-north', name: 'Northgate Annex', city: 'Utrecht, NL', areaM2: 620, timezone: 'Europe/Amsterdam' },
]

const t = (min: number, max: number) => ({ min, max })

/** Illustrative, crop-specific target ranges — DEMONSTRATION DATA, not agronomic advice. */
export const CROPS: CropProfile[] = [
  { id: 'lettuce', name: 'Butterhead Lettuce', variety: 'Rex', category: 'Leafy greens', cycleDays: 35, yieldKgPerM2: 3.2,
    targets: { temperature: t(18, 22), humidity: t(55, 70), co2: t(800, 1200), ppfd: t(200, 280), ph: t(5.6, 6.2), ec: t(0.8, 1.4) } },
  { id: 'basil', name: 'Genovese Basil', variety: 'Genovese', category: 'Herbs', cycleDays: 30, yieldKgPerM2: 2.6,
    targets: { temperature: t(22, 27), humidity: t(50, 65), co2: t(900, 1300), ppfd: t(250, 350), ph: t(5.6, 6.4), ec: t(1.0, 1.6) } },
  { id: 'kale', name: 'Lacinato Kale', variety: 'Black Magic', category: 'Leafy greens', cycleDays: 40, yieldKgPerM2: 2.8,
    targets: { temperature: t(16, 21), humidity: t(55, 70), co2: t(800, 1100), ppfd: t(220, 300), ph: t(5.5, 6.2), ec: t(1.2, 1.8) } },
  { id: 'arugula', name: 'Wild Arugula', variety: 'Sylvetta', category: 'Leafy greens', cycleDays: 24, yieldKgPerM2: 2.2,
    targets: { temperature: t(17, 22), humidity: t(50, 65), co2: t(800, 1100), ppfd: t(180, 260), ph: t(5.8, 6.5), ec: t(0.9, 1.4) } },
  { id: 'mint', name: 'Spearmint', variety: 'Native', category: 'Herbs', cycleDays: 38, yieldKgPerM2: 2.0,
    targets: { temperature: t(20, 25), humidity: t(55, 70), co2: t(800, 1200), ppfd: t(200, 300), ph: t(5.8, 6.5), ec: t(1.0, 1.6) } },
  { id: 'pea', name: 'Pea Shoots', variety: 'Speckled', category: 'Microgreens', cycleDays: 12, yieldKgPerM2: 4.5,
    targets: { temperature: t(18, 23), humidity: t(60, 75), co2: t(700, 1000), ppfd: t(120, 200), ph: t(5.8, 6.5), ec: t(0.6, 1.0) } },
  { id: 'cilantro', name: 'Cilantro', variety: 'Calypso (slow-bolt)', category: 'Herbs', cycleDays: 32, yieldKgPerM2: 2.1,
    targets: { temperature: t(17, 22), humidity: t(50, 65), co2: t(800, 1100), ppfd: t(200, 280), ph: t(6.0, 6.7), ec: t(0.9, 1.4) } },
  { id: 'strawberry', name: 'Strawberry', variety: 'Albion', category: 'Fruiting', cycleDays: 70, yieldKgPerM2: 1.4,
    targets: { temperature: t(18, 24), humidity: t(60, 75), co2: t(700, 1000), ppfd: t(300, 400), ph: t(5.5, 6.2), ec: t(1.0, 1.6) } },
]
export const CROP_BY_ID = new Map(CROPS.map((c) => [c.id, c]))

type ZoneRow = [code: string, name: string, crop: string | null, racks: number, shelves: number, res: string, lights: [number, number]]
const ZONE_ROWS: Record<string, ZoneRow[]> = {
  'fac-aurora': [
    ['A1', 'Leaf Bay 1', 'lettuce', 4, 5, 'res-a', [5, 23]],
    ['A2', 'Leaf Bay 2', 'lettuce', 4, 5, 'res-a', [5, 23]],
    ['A3', 'Leaf Bay 3', 'arugula', 4, 5, 'res-a', [6, 22]],
    ['A4', 'Leaf Bay 4', 'kale', 4, 6, 'res-a', [6, 22]],
    ['B1', 'Herb Bay 1', 'basil', 4, 6, 'res-b', [4, 22]],
    ['B2', 'Herb Bay 2', 'basil', 4, 6, 'res-b', [4, 22]],
    ['B3', 'Herb Bay 3', 'mint', 4, 5, 'res-b', [5, 21]],
    ['B4', 'Herb Bay 4', 'cilantro', 4, 5, 'res-b', [5, 21]],
    ['C1', 'Microgreen Bay 1', 'pea', 6, 5, 'res-c', [6, 22]],
    ['C2', 'Microgreen Bay 2', 'pea', 6, 5, 'res-c', [6, 22]],
    ['C3', 'Microgreen Bay 3 (cleaning)', null, 6, 5, 'res-c', [6, 22]],
    ['D1', 'Specialty Bay 1', 'strawberry', 3, 5, 'res-d', [4, 22]],
    ['D2', 'Specialty Bay 2', 'lettuce', 3, 5, 'res-d', [5, 23]],
    ['D3', 'Specialty Bay 3 (retrofit)', null, 3, 5, 'res-d', [5, 23]],
  ],
  'fac-north': [
    ['N1', 'Annex Bay 1', 'lettuce', 3, 4, 'res-n1', [5, 23]],
    ['N2', 'Annex Bay 2', 'basil', 3, 4, 'res-n1', [4, 22]],
    ['N3', 'Annex Bay 3', 'kale', 3, 4, 'res-n1', [6, 22]],
    ['N4', 'Annex Bay 4', 'arugula', 3, 4, 'res-n2', [6, 22]],
    ['N5', 'Annex Bay 5', 'mint', 3, 4, 'res-n2', [5, 21]],
    ['N6', 'Annex Bay 6 (idle)', null, 3, 4, 'res-n2', [5, 23]],
  ],
}

export const ZONES: Zone[] = FACILITIES.flatMap((f) =>
  ZONE_ROWS[f.id].map(([code, name, crop, racks, shelves, res, lights]): Zone => ({
    id: `z-${code.toLowerCase()}`,
    code,
    name,
    facilityId: f.id,
    cropProfileId: crop,
    racks,
    shelvesPerRack: shelves,
    areaM2: Math.round(racks * shelves * 1.2 * 10) / 10,
    reservoirId: res,
    lightsOn: lights,
  })),
)
export const ZONE_BY_ID = new Map(ZONES.map((z) => [z.id, z]))

const RES_META: [id: string, name: string, fac: string, cap: number][] = [
  ['res-a', 'Reservoir A · Leaf Halls', 'fac-aurora', 2400],
  ['res-b', 'Reservoir B · Herb Halls', 'fac-aurora', 2400],
  ['res-c', 'Reservoir C · Microgreens', 'fac-aurora', 1800],
  ['res-d', 'Reservoir D · Specialty', 'fac-aurora', 1600],
  ['res-n1', 'Reservoir N1 · Annex West', 'fac-north', 1200],
  ['res-n2', 'Reservoir N2 · Annex East', 'fac-north', 1200],
]
export const RESERVOIRS: Reservoir[] = RES_META.map(([id, name, facilityId, capacityL]) => ({
  id,
  name,
  facilityId,
  capacityL,
  zoneIds: ZONES.filter((z) => z.reservoirId === id).map((z) => z.id),
}))
export const RESERVOIR_BY_ID = new Map(RESERVOIRS.map((r) => [r.id, r]))

/* ----------------------------- Equipment ----------------------------- */

const MODELS: Record<EquipmentType, string> = {
  pump: 'AquaFlow AF-300',
  light: 'SpectraBar LX-640',
  hvac: 'ClimaCore CC-12',
  sensor: 'SenseNode S4 (T/RH/CO₂/PPFD)',
  gateway: 'EdgeLink GW-2',
}

const FAULT_TEXT: Record<string, [string, string]> = {
  'EQ-HVC-B': ['DHU-204', 'Dehumidifier coil temperature high — reduced moisture removal'],
  'EQ-PMP-C': ['VIB-31', 'Pump vibration above baseline'],
  'EQ-GW-02': ['LAT-12', 'Uplink latency elevated'],
}
const SCENARIO_STATUS: Record<string, HealthStatus> = {
  'EQ-HVC-B': 'warning',
  'EQ-PMP-C': 'warning',
  'EQ-GW-02': 'warning',
}
const INACTIVE_ZONE_IDS = new Set(ZONES.filter((z) => !z.cropProfileId).map((z) => z.id))

function makeEquipment(): Equipment[] {
  const out: Equipment[] = []
  const push = (
    id: string,
    name: string,
    type: EquipmentType,
    facilityId: string,
    hall: string,
    zoneId: string | null,
    reservoirId: string | null,
  ) => {
    const r = mulberry32(hashString(id))
    const offline = zoneId !== null && INACTIVE_ZONE_IDS.has(zoneId) && (type === 'light' || type === 'sensor')
    const status: HealthStatus = SCENARIO_STATUS[id] ?? (offline ? 'offline' : 'operational')
    let due = NOW + between(r, 20, 120) * DAY
    if (id === 'EQ-PMP-D') due = NOW - 6 * DAY // overdue → drives a maintenance alert
    if (id === 'EQ-HVC-A') due = NOW + 5 * DAY // due soon
    const faults: Fault[] = []
    const scenario = FAULT_TEXT[id]
    if (scenario) faults.push({ id: `${id}-f0`, at: iso(NOW - between(r, 2, 9) * HOUR), code: scenario[0], message: scenario[1] })
    if (!scenario && r() < 0.3) {
      faults.push({ id: `${id}-f1`, at: iso(NOW - between(r, 4, 20) * DAY), code: 'AUTO-RST', message: 'Controller self-reset (cleared)' })
    }
    out.push({
      id, name, type, facilityId, zoneId, reservoirId, hall, model: MODELS[type], status,
      lastSeen: iso(NOW - (status === 'offline' ? between(r, 2, 40) * HOUR : between(r, 4, 70) * 1000)),
      maintenanceDue: iso(due),
      faults,
    })
  }
  for (const f of FACILITIES) {
    const zs = ZONES.filter((z) => z.facilityId === f.id)
    for (const z of zs) {
      push(`EQ-LED-${z.code}`, `LED Array ${z.code}`, 'light', f.id, z.code[0], z.id, z.reservoirId)
      push(`EQ-SNS-${z.code}`, `Sensor Node ${z.code}`, 'sensor', f.id, z.code[0], z.id, z.reservoirId)
    }
    for (const hall of [...new Set(zs.map((z) => z.code[0]))]) push(`EQ-HVC-${hall}`, `HVAC Hall ${hall}`, 'hvac', f.id, hall, null, null)
    for (const r of RESERVOIRS.filter((x) => x.facilityId === f.id)) {
      const tag = r.id.replace('res-', '').toUpperCase()
      push(`EQ-PMP-${tag}`, `Irrigation Pump ${tag}`, 'pump', f.id, tag[0], null, r.id)
    }
  }
  push('EQ-GW-01', 'Gateway 01', 'gateway', 'fac-aurora', 'A', null, null)
  push('EQ-GW-02', 'Gateway 02', 'gateway', 'fac-aurora', 'C', null, null)
  push('EQ-GW-03', 'Gateway 03', 'gateway', 'fac-north', 'N', null, null)
  return out
}
export const EQUIPMENT: Equipment[] = makeEquipment()

/** Deterministic simulated 14-day status history for an equipment item. Newest first; first entry matches current status. */
export function statusHistory(eq: Equipment): StatusEvent[] {
  const r = mulberry32(hashString(`hist-${eq.id}`))
  const events: StatusEvent[] = []
  const start = eq.status === 'offline' ? 2 : eq.status === 'operational' ? between(r, 3, 13) : between(r, 0.1, 0.4)
  events.push({
    at: iso(NOW - start * DAY),
    status: eq.status,
    note: eq.status === 'operational' ? 'Self-check passed' : eq.faults[0]?.message ?? (eq.status === 'offline' ? 'Zone idle / no heartbeat' : 'Threshold exceeded'),
  })
  const notes: [HealthStatus, string][] = [
    ['warning', 'Latency above baseline'],
    ['operational', 'Recovered automatically'],
    ['warning', 'Minor drift detected'],
    ['operational', 'Technician check completed'],
    ['offline', 'Heartbeat lost — reconnected'],
    ['operational', 'Firmware update applied'],
  ]
  let at = NOW - start * DAY
  for (let i = 0; i < 4 && at > NOW - 14 * DAY; i++) {
    at -= between(r, 1, 3.5) * DAY
    const [status, note] = pick(r, notes)
    events.push({ at: iso(at), status, note })
  }
  return events
}

/* ------------------------------ Batches ------------------------------ */

/** [zoneCode, daysSincePlanted] — current batches. Several zones hold two staggered batches. */
const CURRENT: [string, number][] = [
  ['A1', 28], ['A1', 8], ['A2', 33], ['A3', 20], ['A3', 7], ['A4', 12],
  ['B1', 26], ['B1', 18], ['B2', 9], ['B3', 31], ['B4', 18],
  ['C1', 10], ['C1', 3], ['C2', 4], ['D1', 41], ['D2', 35],
  ['N1', 15], ['N2', 22], ['N3', 30], ['N4', 10], ['N5', 12],
]

export function stageFor(daysSince: number, cycleDays: number): BatchStage {
  const f = daysSince / cycleDays
  if (f >= 1) return 'Ready to harvest'
  if (f < 0.1) return 'Germination'
  if (f < 0.3) return 'Seedling'
  if (f < 0.7) return 'Vegetative'
  return 'Maturation'
}

function makeBatches(): Batch[] {
  const out: Batch[] = []
  const used = new Map<string, number>()
  const mk = (z: Zone, plantedAt: number, harvested: boolean, r: () => number): Batch => {
    const crop = CROP_BY_ID.get(z.cropProfileId!)!
    const base = `B-${format(plantedAt, 'yyMMdd')}-${z.code}`
    const n = used.get(base) ?? 0
    used.set(base, n + 1)
    const expected = Math.round(crop.yieldKgPerM2 * z.areaM2 * between(r, 0.4, 0.55) * 10) / 10
    const eta = plantedAt + crop.cycleDays * DAY
    const b: Batch = {
      id: n ? `${base}-${String.fromCharCode(65 + n)}` : base,
      facilityId: z.facilityId,
      zoneId: z.id,
      cropProfileId: crop.id,
      plantedAt: iso(plantedAt),
      harvestEta: iso(eta),
      trays: Math.round(z.racks * z.shelvesPerRack * between(r, 0.4, 0.6)),
      expectedYieldKg: expected,
    }
    if (harvested) {
      b.harvestedAt = iso(eta)
      b.actualYieldKg = Math.round(expected * between(r, 0.88, 1.04) * 10) / 10
      b.lossKg = Math.round(expected * between(r, 0.02, 0.08) * 10) / 10
    }
    return b
  }

  for (const [code, since] of CURRENT) {
    const z = ZONES.find((x) => x.code === code)!
    out.push(mk(z, NOW - since * DAY, false, mulberry32(hashString(`cur-${code}-${since}`))))
  }
  // Harvested history (~90 days back) — one rolling lane of cycles per active zone.
  for (const z of ZONES.filter((x) => x.cropProfileId)) {
    const crop = CROP_BY_ID.get(z.cropProfileId!)!
    const oldest = Math.min(...CURRENT.filter(([c]) => c === z.code).map(([, d]) => d))
    let planted = NOW - oldest * DAY - crop.cycleDays * DAY - 1 * DAY
    const r = mulberry32(hashString(`hist-${z.code}`))
    while (planted + crop.cycleDays * DAY > NOW - 92 * DAY) {
      out.push(mk(z, planted, true, r))
      planted -= (crop.cycleDays + Math.round(between(r, 0, 2))) * DAY
    }
  }
  return out
}
export const BATCHES: Batch[] = makeBatches()
