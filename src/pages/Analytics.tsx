import { useState } from 'react'
import { Segmented } from '@/components/ui/Form'
import { PageHeader } from '@/components/ui/Display'
import { ConsumptionCharts, YieldCharts } from '@/components/domain/analytics/charts'
import { ExportPanel } from '@/components/domain/analytics/ExportPanel'
import { AnalyticsKpis } from '@/components/domain/analytics/Kpis'
import { RANGE_DAYS, RANGES, useAnalyticsModel, type RangeKey } from '@/components/domain/analytics/model'
import { LossTable, ResourceTable } from '@/components/domain/analytics/tables'
import { useFacility } from '@/store/hooks'
import type { TimeRange } from '@/types'

export default function Analytics() {
  const facility = useFacility()
  const [range, setRange] = useState<RangeKey>('30d')
  const days = RANGE_DAYS[range]
  const m = useAnalyticsModel(range)
  const timeRange: TimeRange = range === '7d' ? '7d' : '30d'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description={`Harvest, yield, loss and resource use for ${facility.name} over the last ${days} days.`}
        actions={<Segmented value={range} onChange={setRange} options={RANGES} label="Date range" />}
      />
      <AnalyticsKpis m={m} days={days} />
      <ConsumptionCharts m={m} range={timeRange} />
      <YieldCharts m={m} range={timeRange} />
      <LossTable rows={m.lossRows} />
      <ResourceTable m={m} />
      <ExportPanel m={m} range={range} />
      <p className="text-xs text-dim">Simulated data — figures are illustrative and not performance claims.</p>
    </div>
  )
}
