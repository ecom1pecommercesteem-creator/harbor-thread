import { differenceInCalendarDays } from 'date-fns'
import { Cherry, Leaf, Sprout, Wheat, type LucideIcon } from 'lucide-react'
import { CROP_BY_ID, ZONE_BY_ID, stageFor } from '@/data/seed'
import { num } from '@/lib/format'
import { batchStatus } from '@/sim/rules'
import type { Batch, BatchStage, BatchStatus, CropProfile, HealthStatus, Zone } from '@/types'

export const STAGES: BatchStage[] = ['Germination', 'Seedling', 'Vegetative', 'Maturation', 'Ready to harvest', 'Harvested']

export const CATEGORY_ICON: Record<CropProfile['category'], LucideIcon> = {
  'Leafy greens': Leaf,
  Herbs: Sprout,
  Microgreens: Wheat,
  Fruiting: Cherry,
}

export interface BatchRow {
  batch: Batch
  crop: CropProfile
  zone: Zone
  status: BatchStatus
  harvested: boolean
  stage: BatchStage
  /** Calendar days since planting (negative = planting is in the future). */
  daysSince: number
  /** Calendar days until the harvest estimate (<= 0 means ready or overdue). */
  daysToEta: number
  /** 0–100 progress to harvest. */
  progress: number
  plantedMs: number
  etaMs: number
}

export function buildRow(b: Batch, health: Record<string, HealthStatus>, now: Date): BatchRow {
  const crop = CROP_BY_ID.get(b.cropProfileId)!
  const zone = ZONE_BY_ID.get(b.zoneId)!
  const harvested = !!b.harvestedAt
  const planted = new Date(b.plantedAt)
  const eta = new Date(b.harvestEta)
  const daysSince = differenceInCalendarDays(now, planted)
  return {
    batch: b,
    crop,
    zone,
    status: batchStatus(b, health[b.zoneId]),
    harvested,
    stage: harvested ? 'Harvested' : stageFor(daysSince, crop.cycleDays),
    daysSince,
    daysToEta: differenceInCalendarDays(eta, now),
    progress: harvested ? 100 : Math.max(0, Math.min(100, (daysSince / crop.cycleDays) * 100)),
    plantedMs: planted.getTime(),
    etaMs: eta.getTime(),
  }
}

export type Scope = 'active' | 'all' | 'harvested'
export type StatusFilter = 'all' | BatchStatus
export type SortKey = 'eta' | 'planted' | 'days' | 'yield' | 'id'

export interface Filters {
  q: string
  status: StatusFilter
  scope: Scope
  crop: string
  zone: string
}
export const DEFAULT_FILTERS: Filters = { q: '', status: 'all', scope: 'active', crop: 'all', zone: 'all' }

export interface Sort {
  key: SortKey
  dir: 'asc' | 'desc'
}
export const DEFAULT_SORT: Sort = { key: 'eta', dir: 'asc' }

const NUM_KEY: Record<Exclude<SortKey, 'id'>, (r: BatchRow) => number> = {
  eta: (r) => r.etaMs,
  planted: (r) => r.plantedMs,
  days: (r) => r.daysSince,
  yield: (r) => r.batch.expectedYieldKg,
}

export function applyFilters(rows: BatchRow[], f: Filters, sort: Sort): BatchRow[] {
  const q = f.q.trim().toLowerCase()
  const out = rows.filter((r) => {
    // A harvested status selection is explicit, so it overrides the scope.
    const scopeOk = f.status === 'harvested' || f.scope === 'all' || (f.scope === 'harvested') === r.harvested
    const statusOk = f.status === 'all' || r.status === f.status
    const cropOk = f.crop === 'all' || r.crop.id === f.crop
    const zoneOk = f.zone === 'all' || r.zone.id === f.zone
    const qOk = !q || [r.batch.id, r.crop.name, r.crop.variety, r.zone.code].some((s) => s.toLowerCase().includes(q))
    return scopeOk && statusOk && cropOk && zoneOk && qOk
  })
  const sign = sort.dir === 'asc' ? 1 : -1
  out.sort((a, b) => {
    const c = sort.key === 'id' ? a.batch.id.localeCompare(b.batch.id) : NUM_KEY[sort.key](a) - NUM_KEY[sort.key](b)
    return c * sign
  })
  return out
}

export function summarize(rows: BatchRow[]) {
  const active = rows.filter((r) => !r.harvested)
  return {
    active: active.length,
    trays: active.reduce((s, r) => s + r.batch.trays, 0),
    ready: active.filter((r) => r.stage === 'Ready to harvest').length,
    attention: active.filter((r) => r.status === 'attention').length,
    atRisk: active.filter((r) => r.status === 'at-risk').length,
    yieldKg: active.reduce((s, r) => s + r.batch.expectedYieldKg, 0),
  }
}

export function etaLabel(r: BatchRow): { text: string; className: string } {
  if (r.harvested) return { text: 'harvested', className: 'text-mute' }
  if (r.daysToEta > 0) return { text: `in ${r.daysToEta} d`, className: 'text-mute' }
  if (r.daysToEta === 0) return { text: 'ready', className: 'text-ok' }
  return { text: `overdue by ${-r.daysToEta} d`, className: 'text-warn' }
}

export function ageLabel(r: BatchRow): string {
  return r.daysSince < 0 ? `starts in ${-r.daysSince} d` : `${r.daysSince} d`
}

export function yieldLabel(b: Batch): string {
  if (b.harvestedAt) return `${num(b.actualYieldKg ?? b.expectedYieldKg, 1)} kg`
  return `${num(b.expectedYieldKg, 1)} kg`
}
