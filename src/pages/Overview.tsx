import { differenceInCalendarDays, format } from 'date-fns'
import { Droplets, Gauge as GaugeIcon, Waves } from 'lucide-react'
import { lazy, Suspense, useMemo } from 'react'
import { EquipmentHealth } from '@/components/domain/overview/EquipmentHealth'
import { HeroCards } from '@/components/domain/overview/HeroCards'
import { RecentAlerts } from '@/components/domain/overview/RecentAlerts'
import { UpcomingHarvests } from '@/components/domain/overview/UpcomingHarvests'
import { ZoneHealthMap } from '@/components/domain/overview/ZoneHealthMap'
import { Card } from '@/components/ui/Card'
import { Kpi } from '@/components/ui/Display'
import { FarmHero } from '@/components/ui/Photo'
import { todayTotals } from '@/data/history'
import { CROP_BY_ID, ZONE_BY_ID } from '@/data/seed'
import { useFmt, num } from '@/lib/format'
import { USER } from '@/lib/metrics'
import { zoneBreaches } from '@/sim/rules'
import { useFarm } from '@/store'
import { useFacility, useFacilityBatches, useZones } from '@/store/hooks'

// Below the fold and the only thing pulling Recharts into the entry path, so it loads after the hero paints.
const TrendsCard = lazy(() => import('@/components/domain/overview/TrendsCard').then((m) => ({ default: m.TrendsCard })))
const TrendsFallback = () => <Card aria-busy className="min-h-[420px] xl:col-span-2 xl:min-h-[630px]" />

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening' }
const delta = (cur: number, prev: number) => {
  if (prev <= 0) return 'No comparison available'
  const pct = Math.round(((cur - prev) / prev) * 100)
  return pct === 0 ? 'About the same as yesterday at this time' : `${pct > 0 ? '+' : '−'}${Math.abs(pct)} % vs same time yesterday`
}

function LiveIndicator() {
  const paused = useFarm((s) => s.simPaused)
  const sec = useFarm((s) => s.settings.display.simIntervalSec)
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3.5 py-2 text-[13px] text-mute" role="status">
      <span aria-hidden className={paused ? 'size-2 rounded-full bg-warn' : 'size-2 animate-pulse rounded-full bg-lime motion-reduce:animate-none'} />
      {paused ? 'Simulation paused' : `Live monitoring (simulated) · updates every ${sec} s`}
    </span>
  )
}

export default function Overview() {
  const fac = useFacility()
  const zones = useZones()
  const batches = useFacilityBatches()
  const live = useFarm((s) => s.live)
  const settings = useFarm((s) => s.settings)
  const f = useFmt()

  const k = useMemo(() => {
    const activeZones = zones.filter((z) => z.cropProfileId)
    const ids = activeZones.map((z) => z.id)
    const growing = batches.filter((b) => !b.harvestedAt)
    const online = ids.map((id) => live[id]).filter((l) => l?.sensorOnline)
    const avgTemp = online.length ? online.reduce((a, l) => a + l.temperature, 0) / online.length : null
    const outside = activeZones.filter((z) => zoneBreaches(z, live[z.id], settings).some((b) => b.metric === 'temperature')).length
    const avgHum = online.length ? online.reduce((a, l) => a + l.humidity, 0) / online.length : null
    const outsideHum = activeZones.filter((z) => zoneBreaches(z, live[z.id], settings).some((b) => b.metric === 'humidity')).length
    const totals = todayTotals(ids)
    const soon = growing.filter((b) => differenceInCalendarDays(new Date(b.harvestEta), new Date()) <= 7)
    const next = [...growing].sort((a, b) => a.harvestEta.localeCompare(b.harvestEta))[0]
    return {
      active: activeZones.length, total: zones.length, growing: growing.length,
      varieties: new Set(growing.map((b) => b.cropProfileId)).size, trays: growing.reduce((a, b) => a + b.trays, 0),
      avgTemp, outside, avgHum, outsideHum, offline: ids.length - online.length, totals, soon: soon.length, next,
    }
  }, [zones, batches, live, settings])

  return (
    <div className="space-y-6">
      <FarmHero
        title={`${greeting()}, ${USER.name.split(' ')[0]}`}
        description={<>{fac.name} · {format(new Date(), 'EEEE, d MMMM yyyy')}</>}
        actions={<LiveIndicator />}
      >
        <HeroCards active={k.active} total={k.total} growing={k.growing} varieties={k.varieties} trays={k.trays} avgTemp={k.avgTemp} outside={k.outside} offline={k.offline}
          energyToday={k.totals.energy.today} energySub={delta(k.totals.energy.today, k.totals.energy.yesterday)} />
      </FarmHero>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi to="/water" label="Water today" icon={<Droplets aria-hidden className="size-4" />} value={num(f.volVal(k.totals.water.today))} unit={f.volUnit} sub={delta(k.totals.water.today, k.totals.water.yesterday)} />
        <Kpi to="/environment" label="Avg humidity" icon={<Waves aria-hidden className="size-4" />} value={k.avgHum === null ? '—' : num(k.avgHum, 1)} unit={k.avgHum === null ? undefined : '%'}
          tone={k.outsideHum ? 'warn' : undefined} sub={k.outsideHum ? `${k.outsideHum} zone${k.outsideHum > 1 ? 's' : ''} outside target` : k.offline ? `${k.offline} sensor${k.offline > 1 ? 's' : ''} stale — excluded` : 'All zones within target'} />
        <Kpi to="/crops" label="Harvests ≤ 7 days" icon={<GaugeIcon aria-hidden className="size-4" />} value={k.soon} unit="batches"
          sub={k.next ? `Next: Zone ${ZONE_BY_ID.get(k.next.zoneId)?.code} ${CROP_BY_ID.get(k.next.cropProfileId)?.name}` : 'None scheduled'} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Suspense fallback={<TrendsFallback />}><TrendsCard /></Suspense>
        <RecentAlerts />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <ZoneHealthMap />
        <EquipmentHealth />
        <UpcomingHarvests />
      </div>
    </div>
  )
}
