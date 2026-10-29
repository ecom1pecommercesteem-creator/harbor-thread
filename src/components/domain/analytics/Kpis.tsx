import { Droplets, Sprout, Target, Trash2, Zap } from 'lucide-react'
import { Kpi } from '@/components/ui/Display'
import { num } from '@/lib/format'
import type { AnalyticsModel } from './model'

const fmtOr = (v: number | null, d: number) => (v === null ? '—' : num(v, d))

export function AnalyticsKpis({ m, days }: { m: AnalyticsModel; days: number }) {
  const k = m.kpi
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi label="Harvested" icon={<Sprout className="size-4" />} value={num(k.actualKg, 1)} unit="kg" sub={`${k.batches} batch${k.batches === 1 ? '' : 'es'} in the last ${days} days`} />
      <Kpi label="Actual vs expected" icon={<Target className="size-4" />} value={k.yieldPct === null ? '—' : `${num(k.yieldPct, 1)}%`} sub={`${num(k.expectedKg, 1)} kg expected for the same batches`} />
      <Kpi label="Loss / waste" icon={<Trash2 className="size-4" />} value={num(k.lossKg, 1)} unit="kg" sub={k.lossPct === null ? 'No harvests in this range' : `${num(k.lossPct, 1)}% of gross (actual + loss)`} />
      <Kpi label="Energy" icon={<Zap className="size-4" />} value={num(m.kpi.energyKwh, 0)} unit="kWh" sub="All zones, summed" />
      <Kpi label="Water" icon={<Droplets className="size-4" />} value={num(k.waterVol, 0)} unit={m.volUnit} sub="All zones, summed" />
      <Kpi label="Energy per kg harvested" value={fmtOr(k.energyPerKg, 2)} unit={k.energyPerKg === null ? undefined : 'kWh/kg'} sub="Facility energy ÷ harvested kg" />
      <Kpi label="Water per kg harvested" value={fmtOr(k.waterPerKg, 2)} unit={k.waterPerKg === null ? undefined : `${m.volUnit}/kg`} sub="Facility water ÷ harvested kg" />
    </div>
  )
}
