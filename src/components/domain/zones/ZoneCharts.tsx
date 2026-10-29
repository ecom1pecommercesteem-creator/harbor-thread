import { useMemo, useState } from 'react'
import { EmptyState, Section } from '@/components/ui/Display'
import { RANGE_OPTIONS, Segmented } from '@/components/ui/Form'
import { TimeSeriesChart } from '@/components/charts'
import { envSeries } from '@/data/history'
import { useFmt } from '@/lib/format'
import { METRIC_META } from '@/lib/metrics'
import { useFarm } from '@/store'
import type { Metric, SeriesPoint, TimeRange } from '@/types'
import { InfoNote } from './ZonePrimitives'
import type { ZoneView } from './zoneView'

const CHART_METRICS: Metric[] = ['temperature', 'humidity', 'co2', 'ppfd', 'ph', 'ec']

export function ZoneCharts({ view }: { view: ZoneView }) {
  const fmt = useFmt()
  const defaultRange = useFarm((s) => s.settings.display.defaultRange)
  const live = useFarm((s) => s.live)
  const histVersion = useFarm((s) => s.histVersion)
  const [picked, setPicked] = useState<TimeRange | null>(null)
  const range = picked ?? defaultRange
  const zoneId = view.zone.id
  const targets = view.targets

  const charts = useMemo(
    () =>
      CHART_METRICS.map((m) => {
        const toDisplay = (v: number) => (m === 'temperature' ? fmt.tempVal(v) : v)
        const meta = METRIC_META[m]
        const unit = m === 'temperature' ? fmt.tempUnit : meta.unit
        const data: SeriesPoint[] = envSeries([zoneId], m, range, live).map((p) => ({ t: p.t, [m]: toDisplay(p.value) }))
        const band = targets ? { min: toDisplay(targets[m].min), max: toDisplay(targets[m].max) } : null
        return {
          metric: m,
          label: meta.label,
          data,
          band,
          series: [{ key: m, label: meta.label, unit, decimals: m === 'temperature' ? 1 : meta.decimals }],
        }
      }),
    [zoneId, range, live, histVersion, fmt, targets],
  )

  if (!view.crop) {
    return (
      <Section title="Conditions over time">
        <InfoNote>Idle zone — there is no sensor history to chart until a crop is assigned.</InfoNote>
      </Section>
    )
  }

  return (
    <Section
      title="Conditions over time"
      action={<Segmented size="sm" label="Chart time range" value={range} onChange={setPicked} options={RANGE_OPTIONS} />}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {charts.map((c) => (
          <div key={c.metric} className="rounded-xl border border-line bg-card-2 p-4">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h4 className="text-sm text-ink">{c.label}</h4>
              {c.band && <span className="text-[11px] text-mute">Shaded = target range</span>}
            </div>
            {c.data.length === 0 ? (
              <EmptyState title="No history" message="No readings for this metric yet." />
            ) : (
              <TimeSeriesChart
                label={`${c.label} for zone ${view.zone.code}, last ${range}`}
                data={c.data}
                series={c.series}
                range={range}
                height={180}
                band={c.band}
              />
            )}
          </div>
        ))}
      </div>
    </Section>
  )
}
