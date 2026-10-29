import { useMemo } from 'react'
import { format } from 'date-fns'
import { consumptionBuckets, consumptionByZone } from '@/data/history'
import { CROP_BY_ID, DAY } from '@/data/seed'
import { useFmt } from '@/lib/format'
import { useFarm } from '@/store'
import { useFacilityBatches, useZones } from '@/store/hooks'
import type { Batch, SeriesPoint, Zone } from '@/types'

export type RangeKey = '7d' | '30d' | '90d'
export const RANGE_DAYS: Record<RangeKey, number> = { '7d': 7, '30d': 30, '90d': 90 }
export const RANGES: { value: RangeKey; label: string }[] = [
  { value: '7d', label: '7 d' },
  { value: '30d', label: '30 d' },
  { value: '90d', label: '90 d' },
]

export type Dataset = 'water-energy' | 'harvest' | 'batch-yield' | 'zone-yield' | 'loss-crop' | 'resource-zone'
export const DATASETS: { value: Dataset; label: string }[] = [
  { value: 'water-energy', label: 'Water & energy (daily)' },
  { value: 'harvest', label: 'Harvest output' },
  { value: 'batch-yield', label: 'Yield by batch' },
  { value: 'zone-yield', label: 'Yield per zone' },
  { value: 'loss-crop', label: 'Loss by crop' },
  { value: 'resource-zone', label: 'Resource comparison by zone' },
]

export type CsvRow = Record<string, string | number>

export interface ZoneResource {
  zone: Zone
  energyKwh: number
  /** Display volume unit (Settings). */
  waterVol: number
  actualKg: number
  energyPerKg: number | null
  waterPerKg: number | null
  /** Descriptive: % difference of energy/kg vs the median zone with a harvest. */
  vsMedianPct: number | null
}

export interface LossRow {
  crop: string
  batches: number
  actualKg: number
  lossKg: number
  lossPct: number | null
}

export interface AnalyticsModel {
  volUnit: string
  bucketLabel: 'day' | 'week'
  kpi: {
    batches: number
    actualKg: number
    expectedKg: number
    lossKg: number
    yieldPct: number | null
    lossPct: number | null
    energyKwh: number
    waterVol: number
    energyPerKg: number | null
    waterPerKg: number | null
  }
  /** Daily points: water (display volume unit), energy (kWh). */
  daily: SeriesPoint[]
  /** Harvest per bucket (kg): actual and loss. t = bucket end. */
  harvestSeries: SeriesPoint[]
  /** All harvested batches in range, largest actual yield first. */
  batches: { id: string; expected: number; actual: number; zoneCode: string; crop: string }[]
  zoneYield: { label: string; kgPerM2: number }[]
  lossRows: LossRow[]
  resources: ZoneResource[]
  medianEnergyPerKg: number | null
  datasets: Record<Dataset, CsvRow[]>
}

const round = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
/** Division guarded against zero/negative denominators: null means "no data". */
const ratio = (a: number, b: number) => (b > 0 ? a / b : null)
const median = (xs: number[]) => {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const day = (t: number) => format(t, 'yyyy-MM-dd')
const dayOf = (iso?: string) => (iso ? format(new Date(iso), 'yyyy-MM-dd') : '')
const actualOf = (b: Batch) => b.actualYieldKg ?? 0
const lossOf = (b: Batch) => b.lossKg ?? 0
const tOf = (b: Batch) => Date.parse(b.harvestedAt ?? '')

export function buildModel(zones: Zone[], batches: Batch[], days: number, now: number, volUnit: string, volFactor: number): AnalyticsModel {
  const start = now - days * DAY
  const zoneIds = zones.map((z) => z.id)
  const zoneById = new Map(zones.map((z) => [z.id, z]))

  const harvested = batches
    .filter((b) => b.harvestedAt && tOf(b) >= start && tOf(b) <= now)
    .sort((a, b) => actualOf(b) - actualOf(a))
  const byZone = new Map<string, Batch[]>()
  for (const b of harvested) byZone.set(b.zoneId, [...(byZone.get(b.zoneId) ?? []), b])
  const actualIn = (list: Batch[] = []) => sum(list.map(actualOf))

  const actualRaw = sum(harvested.map(actualOf))
  const expectedRaw = sum(harvested.map((b) => b.expectedYieldKg))
  const lossRaw = sum(harvested.map(lossOf))

  // Consumption: daily buckets over the window (same source as the Overview/Water pages).
  const waterRaw = consumptionBuckets(zoneIds, 'water', days * 24, 24)
  const energyRaw = consumptionBuckets(zoneIds, 'energy', days * 24, 24)
  const daily: SeriesPoint[] = waterRaw.map((w, i) => ({ t: w.t, water: round(w.value * volFactor, 1), energy: round(energyRaw[i]?.value ?? 0, 1) }))
  const energyKwh = sum(energyRaw.map((p) => p.value))
  const waterL = sum(waterRaw.map((p) => p.value))

  // Harvest buckets: daily for 7 d, weekly for 30 d and 90 d. Bucket t = bucket end.
  const bucketDays = days >= 30 ? 7 : 1
  const bucketMs = bucketDays * DAY
  const n = Math.ceil(days / bucketDays)
  const kg = Array.from({ length: n }, (_, k) => ({ t: now - (n - 1 - k) * bucketMs, actual: 0, loss: 0 }))
  for (const b of harvested) {
    const k = Math.min(n - 1, Math.max(0, n - 1 - Math.floor((now - tOf(b)) / bucketMs)))
    kg[k].actual += actualOf(b)
    kg[k].loss += lossOf(b)
  }
  const harvestSeries: SeriesPoint[] = kg.map((b) => ({ t: b.t, actual: round(b.actual, 1), loss: round(b.loss, 1) }))

  const batchRows = harvested.map((b) => ({
    id: b.id,
    expected: round(b.expectedYieldKg, 1),
    actual: round(actualOf(b), 1),
    zoneCode: zoneById.get(b.zoneId)?.code ?? b.zoneId,
    crop: CROP_BY_ID.get(b.cropProfileId)?.name ?? b.cropProfileId,
  }))

  const cons = consumptionByZone(zoneIds, days)
  const resourcesBase = zones.map((z) => {
    const c = cons[z.id] ?? { energy: 0, water: 0 }
    const a = actualIn(byZone.get(z.id))
    return {
      zone: z,
      energyKwh: c.energy,
      waterVol: round(c.water * volFactor, 1),
      actualKg: a,
      energyPerKg: ratio(c.energy, a),
      waterPerKg: ratio(c.water * volFactor, a),
    }
  })
  const medianEnergyPerKg = median(resourcesBase.flatMap((r) => (r.energyPerKg === null ? [] : [r.energyPerKg])))
  const resources: ZoneResource[] = resourcesBase.map((r) => ({
    ...r,
    vsMedianPct: r.energyPerKg !== null && medianEnergyPerKg ? (r.energyPerKg / medianEnergyPerKg - 1) * 100 : null,
  }))

  const zoneYield = resources
    .filter((r) => r.actualKg > 0)
    .map((r) => ({ label: r.zone.code, kgPerM2: round(ratio(r.actualKg, r.zone.areaM2) ?? 0, 2) }))
    .sort((a, b) => b.kgPerM2 - a.kgPerM2)

  const lossRows: LossRow[] = [...new Set(harvested.map((b) => b.cropProfileId))]
    .map((id) => {
      const list = harvested.filter((b) => b.cropProfileId === id)
      const a = actualIn(list)
      const l = sum(list.map(lossOf))
      return { crop: CROP_BY_ID.get(id)?.name ?? id, batches: list.length, actualKg: a, lossKg: l, lossPct: ratio(l * 100, a + l) }
    })
    .sort((x, y) => y.lossKg - x.lossKg)

  const wUnit = `Water (${volUnit})`
  const datasets: Record<Dataset, CsvRow[]> = {
    'water-energy': daily.map((d) => ({ Date: day(d.t), [wUnit]: d.water, 'Energy (kWh)': d.energy })),
    harvest: harvestSeries.map((h) => ({ 'Period end': day(h.t), 'Harvested (kg)': h.actual, 'Loss (kg)': h.loss })),
    'batch-yield': harvested.map((b) => ({
      'Batch ID': b.id,
      Zone: zoneById.get(b.zoneId)?.code ?? b.zoneId,
      Crop: CROP_BY_ID.get(b.cropProfileId)?.name ?? b.cropProfileId,
      'Harvested on': dayOf(b.harvestedAt),
      'Expected (kg)': round(b.expectedYieldKg, 1),
      'Actual (kg)': round(actualOf(b), 1),
      'Loss (kg)': round(lossOf(b), 1),
      'Actual vs expected (%)': round(ratio(actualOf(b) * 100, b.expectedYieldKg) ?? 0, 1),
    })),
    'zone-yield': resources.map((r) => ({
      Zone: r.zone.code,
      'Zone name': r.zone.name,
      'Area (m²)': r.zone.areaM2,
      'Actual yield (kg)': round(r.actualKg, 1),
      'Yield per m² (kg/m²)': round(ratio(r.actualKg, r.zone.areaM2) ?? 0, 2),
    })),
    'loss-crop': lossRows.map((r) => ({
      Crop: r.crop,
      Batches: r.batches,
      'Actual (kg)': round(r.actualKg, 1),
      'Loss (kg)': round(r.lossKg, 1),
      'Loss (% of gross)': r.lossPct === null ? '' : round(r.lossPct, 1),
    })),
    'resource-zone': resources.map((r) => ({
      Zone: r.zone.code,
      'Zone name': r.zone.name,
      'Energy (kWh)': round(r.energyKwh, 1),
      [wUnit]: r.waterVol,
      'Actual yield (kg)': round(r.actualKg, 1),
      'Energy per kg (kWh/kg)': r.energyPerKg === null ? '' : round(r.energyPerKg, 2),
      [`Water per kg (${volUnit}/kg)`]: r.waterPerKg === null ? '' : round(r.waterPerKg, 2),
    })),
  }

  return {
    volUnit,
    bucketLabel: bucketDays === 1 ? 'day' : 'week',
    kpi: {
      batches: harvested.length,
      actualKg: actualRaw,
      expectedKg: expectedRaw,
      lossKg: lossRaw,
      yieldPct: ratio(actualRaw * 100, expectedRaw),
      lossPct: ratio(lossRaw * 100, actualRaw + lossRaw),
      energyKwh,
      waterVol: waterL * volFactor,
      energyPerKg: ratio(energyKwh, actualRaw),
      waterPerKg: ratio(waterL * volFactor, actualRaw),
    },
    daily,
    harvestSeries,
    batches: batchRows,
    zoneYield,
    lossRows,
    resources,
    medianEnergyPerKg,
    datasets,
  }
}

/** Recomputes when the facility, range, unit preference or simulated history changes. */
export function useAnalyticsModel(range: RangeKey): AnalyticsModel {
  const zones = useZones()
  const batches = useFacilityBatches()
  const histVersion = useFarm((s) => s.histVersion)
  const fmt = useFmt()
  const volUnit = fmt.volUnit
  const volFactor = fmt.volVal(1)
  return useMemo(
    () => buildModel(zones, batches, RANGE_DAYS[range], Date.now(), volUnit, volFactor),
    [zones, batches, range, volUnit, volFactor, histVersion],
  )
}
