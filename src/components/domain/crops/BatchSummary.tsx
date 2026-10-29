import { Package, Scale, Sprout, TriangleAlert } from 'lucide-react'
import { useMemo } from 'react'
import { Kpi } from '@/components/ui/Display'
import { num } from '@/lib/format'
import { summarize, type BatchRow } from './batchView'

export function BatchSummary({ rows }: { rows: BatchRow[] }) {
  const s = useMemo(() => summarize(rows), [rows])
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi label="Active batches" value={s.active} icon={<Sprout className="size-4" />} sub={`${num(s.trays)} trays in production`} />
      <Kpi label="Ready to harvest" value={s.ready} icon={<Package className="size-4" />} sub="Crop cycle complete" />
      <Kpi
        label="Needs attention"
        value={s.attention + s.atRisk}
        icon={<TriangleAlert className="size-4" />}
        tone={s.atRisk ? 'crit' : s.attention ? 'warn' : undefined}
        sub={`${s.atRisk} at risk from zone conditions`}
      />
      <Kpi label="Expected yield" value={num(s.yieldKg, 1)} unit="kg" icon={<Scale className="size-4" />} sub="Active batches (demo estimate)" />
    </div>
  )
}
