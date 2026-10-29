import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { EmptyState, PageHeader, Section } from '@/components/ui/Display'
import { FilterSelect, RANGE_OPTIONS, Segmented } from '@/components/ui/Form'
import { SensorCard } from '@/components/domain/env/SensorCard'
import { SensorPanel } from '@/components/domain/env/SensorPanel'
import { TrendCharts } from '@/components/domain/env/TrendCharts'
import { ZonesVsTargets } from '@/components/domain/env/ZonesVsTargets'
import { activeZonesOf, buildCards, cropName } from '@/components/domain/env/envModel'
import { effectiveTargets } from '@/sim/rules'
import { useFmt } from '@/lib/format'
import { useFacilityEquipment, useZones } from '@/store/hooks'
import { useFarm } from '@/store'
import type { TimeRange } from '@/types'

export default function EnvironmentPage() {
  const [params, setParams] = useSearchParams()
  const f = useFmt()
  const zones = useZones()
  const equipment = useFacilityEquipment()
  const live = useFarm((s) => s.live)
  const settings = useFarm((s) => s.settings)
  const [range, setRange] = useState<TimeRange>(settings.display.defaultRange)

  const active = useMemo(() => activeZonesOf(zones), [zones])
  const idle = useMemo(() => zones.filter((z) => z.cropProfileId === null), [zones])
  // An unknown or idle id in the URL falls back to "All active zones".
  const scope = active.find((z) => z.id === params.get('zone')) ?? null
  const scopeZoneIds = useMemo(() => (scope ? [scope.id] : active.map((z) => z.id)), [scope, active])
  const targets = scope ? effectiveTargets(scope.cropProfileId, settings) : null
  const cards = buildCards(scope, active, live, settings, f)

  const zoneOptions = [
    { value: 'all', label: 'All active zones' },
    ...active.map((z) => ({ value: z.id, label: `Zone ${z.code} · ${cropName(z.cropProfileId)}` })),
  ]
  const setZone = (v: string) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      if (v === 'all') next.delete('zone')
      else next.set('zone', v)
      return next
    })

  const scopeNote = scope
    ? `Showing Zone ${scope.code} · ${cropName(scope.cropProfileId)}, live sensor values.`
    : `Averaged across ${active.length} active zones, online sensors only. Per-zone values are in the table below.`

  return (
    <div className="space-y-6">
      <PageHeader title="Environment" description="Temperature, humidity, CO₂ and light against crop targets, with sensor health for every active zone." />

      {!active.length ? (
        <EmptyState title="No active zones" message="Monitoring starts once a zone has a crop assigned and its sensor node reporting." />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <FilterSelect label="Zone" value={scope ? scope.id : 'all'} onChange={setZone} options={zoneOptions} />
            <Segmented label="Time range" value={range} onChange={(v) => setRange(v)} options={RANGE_OPTIONS} />
          </div>

          <Section title="Current readings">
            <p className="mb-3 text-xs text-dim">Target ranges are illustrative demonstration data. {scopeNote}</p>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {cards.map((c) => (
                <SensorCard key={c.metric} card={c} />
              ))}
            </div>
          </Section>

          <Section title="Trends">
            <TrendCharts zoneIds={scopeZoneIds} targets={targets} range={range} live={live} />
          </Section>

          <Section title="Zones vs targets">
            <ZonesVsTargets zones={scope ? [scope] : active} live={live} settings={settings} />
          </Section>

          <SensorPanel zones={active} idle={idle} live={live} equipment={equipment} />
        </>
      )}
    </div>
  )
}
