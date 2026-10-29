import { useMemo, useState } from 'react'
import { BarSeriesChart, CHART_COLORS, TimeSeriesChart } from '@/components/charts'
import { Card, CardHeader } from '@/components/ui/Card'
import { RANGE_OPTIONS, Segmented } from '@/components/ui/Form'
import { consumptionSeries, envSeries } from '@/data/history'
import { useFmt } from '@/lib/format'
import { useFarm } from '@/store'
import { useZones } from '@/store/hooks'
import type { TimeRange } from '@/types'

function Panel({ title, caption, children }: { title: string; caption: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl bg-card-2/60 p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2"><h3 className="text-sm font-normal">{title}</h3><span className="text-[11px] text-mute">{caption}</span></div>
      {children}
    </div>
  )
}

export function TrendsCard() {
  const [range, setRange] = useState<TimeRange>(useFarm.getState().settings.display.defaultRange)
  const zones = useZones()
  const live = useFarm((s) => s.live)
  const histVersion = useFarm((s) => s.histVersion)
  const f = useFmt()
  const active = useMemo(() => zones.filter((z) => z.cropProfileId).map((z) => z.id), [zones])

  const temp = useMemo(() => envSeries(active, 'temperature', range, live).map((p) => ({ t: p.t, value: Math.round(f.tempVal(p.value) * 10) / 10 })), [active, range, live, histVersion, f.tempUnit]) // eslint-disable-line react-hooks/exhaustive-deps
  const hum = useMemo(() => envSeries(active, 'humidity', range, live), [active, range, live, histVersion])
  const energy = useMemo(() => consumptionSeries(active, 'energy', range), [active, range])
  const water = useMemo(() => consumptionSeries(active, 'water', range).map((p) => ({ t: p.t, value: Math.round(f.volVal(p.value)) })), [active, range, f.volUnit]) // eslint-disable-line react-hooks/exhaustive-deps
  const bucket = range === '24h' ? 'per hour' : range === '7d' ? 'per 4 h' : 'per day'

  return (
    <Card className="xl:col-span-2">
      <CardHeader title="Environmental & resource trends" subtitle="Averages across active zones · simulated data" action={<Segmented label="Time range" value={range} onChange={setRange} options={RANGE_OPTIONS} />} />
      <div className="grid gap-3 p-5 md:grid-cols-2">
        <Panel title="Temperature" caption={`avg, ${f.tempUnit}`}>
          <TimeSeriesChart label="Average temperature over time" data={temp} range={range} height={190} area series={[{ key: 'value', label: 'Avg temperature', unit: f.tempUnit }]} yDomain={['auto', 'auto']} />
        </Panel>
        <Panel title="Relative humidity" caption="avg, %">
          <TimeSeriesChart label="Average relative humidity over time" data={hum} range={range} height={190} area series={[{ key: 'value', label: 'Avg humidity', unit: '%', color: CHART_COLORS[1] }]} />
        </Panel>
        <Panel title="Energy consumption" caption={`kWh ${bucket}`}>
          <BarSeriesChart label="Energy consumption over time" data={energy} xKey="t" xKind="time" range={range} height={190} series={[{ key: 'value', label: 'Energy', unit: 'kWh', decimals: 0, color: CHART_COLORS[0] }]} />
        </Panel>
        <Panel title="Water consumption" caption={`${f.volUnit} ${bucket}`}>
          <BarSeriesChart label="Water consumption over time" data={water} xKey="t" xKind="time" range={range} height={190} series={[{ key: 'value', label: 'Water', unit: f.volUnit, decimals: 0, color: CHART_COLORS[1] }]} />
        </Panel>
      </div>
    </Card>
  )
}
