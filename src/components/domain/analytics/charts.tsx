import type { ReactNode } from 'react'
import { BarSeriesChart, CHART_COLORS, TimeSeriesChart } from '@/components/charts'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/Display'
import type { TimeRange } from '@/types'
import type { AnalyticsModel } from './model'

function ChartCard({ title, caption, isEmpty, emptyMessage, children }: { title: string; caption: string; isEmpty: boolean; emptyMessage: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} subtitle={caption} />
      <div className="px-3 pb-5 pt-4">{isEmpty ? <EmptyState title="No data in this range" message={emptyMessage} /> : children}</div>
    </Card>
  )
}

const barHeight = (rows: number) => Math.max(240, rows * 34 + 48)

/** Water, energy and per-zone energy trends. */
export function ConsumptionCharts({ m, range }: { m: AnalyticsModel; range: TimeRange }) {
  const energyBars = m.resources.map((r) => ({ zone: r.zone.code, energy: Number(r.energyKwh.toFixed(1)) }))
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <ChartCard title="Water use per day" caption={`Daily water used by all zones, shown in ${m.volUnit} (Settings unit).`} isEmpty={!m.daily.length} emptyMessage="No consumption history for this facility.">
        <TimeSeriesChart data={m.daily} series={[{ key: 'water', label: `Water (${m.volUnit})`, unit: m.volUnit, decimals: 0, color: CHART_COLORS[1] }]} range={range} yDomain={[0, 'auto']} area label={`Daily water use in ${m.volUnit}`} />
      </ChartCard>
      <ChartCard title="Energy use per day" caption="Daily electricity used by all zones, in kWh (lighting, HVAC and pumps as simulated)." isEmpty={!m.daily.length} emptyMessage="No consumption history for this facility.">
        <TimeSeriesChart data={m.daily} series={[{ key: 'energy', label: 'Energy (kWh)', unit: 'kWh', decimals: 1, color: CHART_COLORS[2] }]} range={range} yDomain={[0, 'auto']} area label="Daily energy use in kWh" />
      </ChartCard>
      <ChartCard title="Energy by zone" caption="Total kWh per zone over the range. Idle zones show only their standby draw." isEmpty={!m.resources.length} emptyMessage="This facility has no zones.">
        <BarSeriesChart data={energyBars} xKey="zone" series={[{ key: 'energy', label: 'Energy (kWh)', unit: 'kWh', decimals: 1, color: CHART_COLORS[2] }]} height={260} label="Energy use per zone in kWh" />
      </ChartCard>
    </div>
  )
}

/** Harvest, yield and loss charts. */
export function YieldCharts({ m, range }: { m: AnalyticsModel; range: TimeRange }) {
  const lossBars = m.lossRows.map((r) => ({ crop: r.crop, loss: Number(r.lossKg.toFixed(1)) }))
  const none = 'No batches were harvested in this range for the selected facility.'
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <ChartCard title="Harvest output over time" caption={`Actual kg harvested per ${m.bucketLabel}. Loss is stacked on top, so each bar is gross output.`} isEmpty={m.kpi.batches === 0} emptyMessage={none}>
        <BarSeriesChart
          data={m.harvestSeries}
          xKey="t"
          xKind="time"
          range={range}
          stacked
          series={[
            { key: 'actual', label: 'Harvested (kg)', unit: 'kg', decimals: 1, color: CHART_COLORS[0] },
            { key: 'loss', label: 'Loss (kg)', unit: 'kg', decimals: 1, color: CHART_COLORS[5] },
          ]}
          label={`Harvested and lost kg per ${m.bucketLabel}`}
        />
      </ChartCard>
      <ChartCard title="Yield by batch" caption="Top 12 batches by actual kg. Batch IDs are on the axis; crop and zone are listed in the loss table and CSV." isEmpty={m.batches.length === 0} emptyMessage={none}>
        <BarSeriesChart
          data={m.batches.slice(0, 12)}
          xKey="id"
          layout="vertical"
          height={barHeight(Math.min(12, m.batches.length))}
          series={[
            { key: 'expected', label: 'Expected (kg)', unit: 'kg', decimals: 1, color: CHART_COLORS[1] },
            { key: 'actual', label: 'Actual (kg)', unit: 'kg', decimals: 1, color: CHART_COLORS[0] },
          ]}
          label="Expected and actual kg for the top batches"
        />
      </ChartCard>
      <ChartCard title="Yield per growing area" caption="Actual kg divided by zone area (kg/m²). Zones with no harvest in this range are left out." isEmpty={m.zoneYield.length === 0} emptyMessage={none}>
        <BarSeriesChart
          data={m.zoneYield}
          xKey="label"
          layout="vertical"
          height={barHeight(m.zoneYield.length)}
          series={[{ key: 'kgPerM2', label: 'kg per m²', unit: 'kg/m²', decimals: 2, color: CHART_COLORS[0] }]}
          label="Harvested kg per square metre by zone"
        />
      </ChartCard>
      <ChartCard title="Crop loss" caption="Loss in kg per crop. The table below shows loss as a share of gross output." isEmpty={m.lossRows.length === 0} emptyMessage={none}>
        <BarSeriesChart data={lossBars} xKey="crop" series={[{ key: 'loss', label: 'Loss (kg)', unit: 'kg', decimals: 1, color: CHART_COLORS[5] }]} height={260} label="Loss in kg per crop" />
      </ChartCard>
    </div>
  )
}
