import { useMemo } from 'react'
import { BarSeriesChart, TimeSeriesChart, type ChartSeries } from '@/components/charts'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/Display'
import { consumptionSeries, reservoirSeries } from '@/data/history'
import { num, useFmt } from '@/lib/format'
import { useFarm } from '@/store'
import type { Range, Reservoir, SeriesPoint, TimeRange } from '@/types'
import { WATER_TEMP_TARGET, type ReservoirContext } from './waterModel'

const PERIOD: Record<TimeRange, string> = { '24h': 'the last 24 h', '7d': 'the last 7 days', '30d': 'the last 30 days' }

function TrendCard({ title, subtitle, data, series, range, band, yFormat, label }: { title: string; subtitle: string; data: SeriesPoint[]; series: ChartSeries[]; range: TimeRange; band?: Range | null; yFormat: (v: number) => string; label: string }) {
  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} />
      <div className="p-5">
        {data.length ? (
          <TimeSeriesChart data={data} series={series} range={range} band={band} yFormat={yFormat} label={label} height={200} />
        ) : (
          <EmptyState title="No history yet" message="No readings were recorded for this reservoir in this range." />
        )}
      </div>
    </Card>
  )
}

export function WaterTrends({ res, ctx, range }: { res: Reservoir; ctx: ReservoirContext; range: TimeRange }) {
  const fmt = useFmt()
  const live = useFarm((s) => s.resLive[res.id])
  const histVersion = useFarm((s) => s.histVersion)
  // Raw series (litres / °C); converted to the user's units while rendering.
  const usage = useMemo(() => consumptionSeries(res.zoneIds, 'water', range), [res.zoneIds, range, histVersion])
  const trend = useMemo(() => reservoirSeries(res.id, range, live), [res.id, range, live, histVersion])

  const totalL = usage.reduce((a, p) => a + p.value, 0)
  const usageRows = usage.map((p) => ({ t: p.t, value: fmt.volVal(p.value) }))
  const tempRows = trend.map((p) => ({ t: p.t, waterTemp: fmt.tempVal(p.waterTemp) }))
  const wtBand = { min: fmt.tempVal(WATER_TEMP_TARGET.min), max: fmt.tempVal(WATER_TEMP_TARGET.max) }
  const bandNote = 'Shaded band = target (shared recipe of fed crops)'

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Water use" subtitle={`${fmt.vol(totalL)} total over ${PERIOD[range]}, drawn by ${res.zoneIds.length} zone${res.zoneIds.length === 1 ? '' : 's'}`} />
        <div className="p-5">
          {totalL > 0 ? (
            <BarSeriesChart
              data={usageRows}
              xKey="t"
              xKind="time"
              range={range}
              series={[{ key: 'value', label: `Water use (${fmt.volUnit})`, unit: fmt.volUnit, decimals: 0 }]}
              yFormat={(v) => num(v)}
              label={`Water use per bucket in ${fmt.volUnit}`}
              height={240}
            />
          ) : (
            <EmptyState title="No water use recorded" message="The zones feeding this reservoir drew no irrigation water in this period." />
          )}
        </div>
      </Card>
      <div className="grid gap-4 xl:grid-cols-2">
        <TrendCard
          title="Reservoir level"
          subtitle="Percent of capacity"
          data={trend}
          series={[{ key: 'levelPct', label: 'Level', unit: '%', decimals: 1 }]}
          range={range}
          yFormat={(v) => `${Math.round(v)}%`}
          label="Reservoir level trend"
        />
        <TrendCard
          title="pH"
          subtitle={ctx.ph ? bandNote : 'No active crops, no target band'}
          data={trend}
          series={[{ key: 'ph', label: 'pH', decimals: 2 }]}
          range={range}
          band={ctx.ph?.target ?? null}
          yFormat={(v) => v.toFixed(2)}
          label="pH trend"
        />
        <TrendCard
          title="EC"
          subtitle={ctx.ec ? bandNote : 'No active crops, no target band'}
          data={trend}
          series={[{ key: 'ec', label: 'EC', unit: 'mS/cm', decimals: 2 }]}
          range={range}
          band={ctx.ec?.target ?? null}
          yFormat={(v) => v.toFixed(2)}
          label="EC trend"
        />
        <TrendCard
          title="Water temperature"
          subtitle={`Illustrative demo target ${fmt.tempVal(WATER_TEMP_TARGET.min).toFixed(0)}–${fmt.tempVal(WATER_TEMP_TARGET.max).toFixed(0)} ${fmt.tempUnit}`}
          data={tempRows}
          series={[{ key: 'waterTemp', label: 'Water temp', unit: fmt.tempUnit, decimals: 1 }]}
          range={range}
          band={wtBand}
          yFormat={(v) => v.toFixed(1)}
          label="Water temperature trend"
        />
      </div>
    </div>
  )
}
