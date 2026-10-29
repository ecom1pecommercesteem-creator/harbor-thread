import { useMemo } from 'react'
import { TimeSeriesChart } from '@/components/charts'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/Display'
import { envSeries } from '@/data/history'
import { useFmt } from '@/lib/format'
import { METRIC_META } from '@/lib/metrics'
import { useFarm } from '@/store'
import type { Metric, Range, TimeRange, ZoneLive } from '@/types'
import { ENV_METRICS, fmtRange, toDisplay, unitOf } from './envModel'

function TrendCard({ m, zoneIds, range, live, band }: { m: Metric; zoneIds: string[]; range: TimeRange; live: Record<string, ZoneLive>; band: Range | null }) {
  const f = useFmt()
  const histVersion = useFarm((s) => s.histVersion)
  const meta = METRIC_META[m]
  const unit = unitOf(m, f)
  // Keyed on tempUnit: the conversion only depends on the temperature unit preference.
  const data = useMemo(
    () => envSeries(zoneIds, m, range, live).map((p) => ({ t: p.t, value: toDisplay(m, p.value, f) })),
    [zoneIds, m, range, live, histVersion, f.tempUnit],
  )
  const bandDisp = band && { min: toDisplay(m, band.min, f), max: toDisplay(m, band.max, f) }
  return (
    <Card>
      <CardHeader title={`${meta.label} trend`} subtitle={band ? `Shaded band = target ${fmtRange(m, band, f)}` : 'Average across reporting zones'} />
      <div className="px-5 pb-5 pt-4">
        {data.length ? (
          <TimeSeriesChart
            area
            label={`${meta.label} over the last ${range}${unit ? `, ${unit}` : ''}`}
            data={data}
            series={[{ key: 'value', label: meta.label, unit, decimals: meta.decimals }]}
            range={range}
            height={220}
            band={bandDisp}
            yFormat={(v) => v.toFixed(meta.decimals)}
          />
        ) : (
          <EmptyState title="No history for this selection" message="Trend data appears once the selected zones have reported readings." />
        )}
      </div>
    </Card>
  )
}

export function TrendCharts({ zoneIds, targets, range, live }: { zoneIds: string[]; targets: Record<Metric, Range> | null; range: TimeRange; live: Record<string, ZoneLive> }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {ENV_METRICS.map((m) => (
        <TrendCard key={m} m={m} zoneIds={zoneIds} range={range} live={live} band={targets?.[m] ?? null} />
      ))}
    </div>
  )
}
