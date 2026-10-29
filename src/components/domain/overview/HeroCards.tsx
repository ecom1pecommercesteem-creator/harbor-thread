import { ArrowUpRight } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { consumptionSeries, envSeries } from '@/data/history'
import { CROP_BY_ID } from '@/data/seed'
import { cx, num, useFmt } from '@/lib/format'
import { useFarm } from '@/store'
import { useFacilityBatches, useZones } from '@/store/hooks'

/** Frosted-glass tile for the Overview hero (Orion reference). Always light-on-dark: it sits on the photo. */
function GlassCard({ to, label, children, className }: { to: string; label: string; children: ReactNode; className?: string }) {
  return (
    <Link to={to} className={cx('group block rounded-[1.75rem] border border-white/25 bg-gradient-to-br from-white/25 to-white/10 p-5 text-ink shadow-[inset_0_1px_0_rgb(255_255_255/0.3),0_24px_40px_-24px_rgb(0_0_0/0.7)] backdrop-blur-2xl transition-colors hover:border-white/45', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[15px] text-ink/85">{label}</span>
        <span aria-hidden className="flex size-7 items-center justify-center rounded-full bg-white/15 transition-colors group-hover:bg-lime group-hover:text-lime-ink"><ArrowUpRight className="size-3.5" /></span>
      </div>
      {children}
    </Link>
  )
}

const Sub = ({ children }: { children: ReactNode }) => <div className="mt-2 text-xs text-ink/70">{children}</div>

/** Line + soft area from a series; the last point gets a lime pill, like the reference's "48%" marker. */
function Sparkline({ values, pill }: { values: number[]; pill: string }) {
  if (values.length < 2) return null
  const lo = Math.min(...values), hi = Math.max(...values), span = hi - lo || 1
  const pts = values.map((v, i) => [(i / (values.length - 1)) * 300, 8 + (1 - (v - lo) / span) * 56] as const)
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const lastY = pts[pts.length - 1][1]
  return (
    <div className="relative mt-4 h-[72px]" aria-hidden>
      <svg viewBox="0 0 300 72" preserveAspectRatio="none" className="size-full overflow-visible">
        <defs><linearGradient id="hero-spark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="white" stopOpacity="0.3" /><stop offset="1" stopColor="white" stopOpacity="0" /></linearGradient></defs>
        <polygon points={`0,72 ${line} 300,72`} fill="url(#hero-spark)" />
        <polyline points={line} fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="absolute -translate-y-1/2 translate-x-1/2 rounded-full bg-lime px-2 py-0.5 text-[11px] font-medium text-lime-ink" style={{ right: 0, top: `${(lastY / 72) * 100}%` }}>{pill}</span>
    </div>
  )
}

/** Proportional pill split by crop category. */
function CategoryPill({ parts }: { parts: [string, number][] }) {
  const tone = ['bg-black/70 text-white', 'bg-white text-black', 'bg-lime text-lime-ink', 'bg-white/30 text-white']
  return (
    <div className="mt-5 flex h-9 gap-1 rounded-full bg-white/15 p-1" role="img" aria-label={parts.map(([n, c]) => `${n} ${c}`).join(', ')}>
      {parts.map(([name, count], i) => (
        <span key={name} style={{ flexGrow: count }} className={cx('flex min-w-0 basis-0 min-w-[4.25rem] items-center justify-center truncate rounded-full px-2 text-[11px]', tone[i % tone.length])}>{name.split(' ')[0]} {count}</span>
      ))}
    </div>
  )
}

interface Props {
  active: number; total: number
  growing: number; varieties: number; trays: number
  avgTemp: number | null; outside: number; offline: number
  energyToday: number; energySub: string
}

export function HeroCards({ active, total, growing, varieties, trays, avgTemp, outside, offline, energyToday, energySub }: Props) {
  const f = useFmt()
  const zones = useZones()
  const batches = useFacilityBatches()
  const live = useFarm((s) => s.live)
  const histVersion = useFarm((s) => s.histVersion)
  const ids = useMemo(() => zones.filter((z) => z.cropProfileId).map((z) => z.id), [zones])

  const temp = useMemo(() => envSeries(ids, 'temperature', '24h', live).map((p) => f.tempVal(p.value)), [ids, live, histVersion, f.tempUnit]) // eslint-disable-line react-hooks/exhaustive-deps
  const energy = useMemo(() => consumptionSeries(ids, 'energy', '24h').map((p) => p.value), [ids])
  const peak = Math.max(...energy, 1)
  const cats = useMemo(() => {
    const m = new Map<string, number>()
    for (const b of batches) if (!b.harvestedAt) { const c = CROP_BY_ID.get(b.cropProfileId)?.category ?? 'Other'; m.set(c, (m.get(c) ?? 0) + 1) }
    return [...m].sort((a, b) => b[1] - a[1])
  }, [batches])

  return (
    <div className="grid items-end gap-4 xl:grid-cols-[minmax(0,24rem)_1fr_minmax(0,36rem)]">
      <GlassCard to="/environment" label="Avg growing temp">
        <div className="mt-3 flex items-baseline gap-1.5">
          <span className={cx('text-[44px] font-light leading-none', outside ? 'text-warn' : 'text-ink')}>{avgTemp === null ? '—' : f.tempVal(avgTemp).toFixed(1)}</span>
          {avgTemp !== null && <span className="text-sm text-ink/70">{f.tempUnit}</span>}
        </div>
        <Sub>{outside ? `${outside} zone${outside > 1 ? 's' : ''} outside target` : offline ? `${offline} sensor${offline > 1 ? 's' : ''} stale — excluded` : 'All zones within target'} · last 24 h</Sub>
        <Sparkline values={temp} pill={avgTemp === null ? '—' : f.tempVal(avgTemp).toFixed(1)} />
      </GlassCard>

      <div className="grid gap-4 xl:col-start-3">
        <GlassCard to="/crops" label="Crops growing">
          <div className="mt-3 flex flex-wrap items-baseline gap-x-7 gap-y-1">
            {([[growing, 'batches'], [varieties, 'varieties'], [trays, 'trays']] as const).map(([v, l]) => (
              <div key={l}><span className="text-[36px] font-light leading-none">{num(v)}</span><span className="ml-1.5 text-xs text-ink/70">{l}</span></div>
            ))}
          </div>
          <CategoryPill parts={cats} />
        </GlassCard>
        <div className="grid gap-4 sm:grid-cols-2">
          <GlassCard to="/zones" label="Active grow zones">
            <div className="mt-3 text-[36px] font-light leading-none">{active}<span className="text-ink/60">/{total}</span></div>
            <div className="mt-4 h-1.5 rounded-full bg-white/20"><div className="h-full rounded-full bg-lime" style={{ width: `${total ? (active / total) * 100 : 0}%` }} /></div>
            <Sub>{total - active ? `${total - active} idle (cleaning / retrofit)` : 'All zones in production'}</Sub>
          </GlassCard>
          <GlassCard to="/analytics" label="Energy today">
            <div className="mt-3 flex items-baseline gap-1.5"><span className="text-[36px] font-light leading-none">{num(energyToday)}</span><span className="text-sm text-ink/70">kWh</span></div>
            <div className="mt-3 flex h-8 items-end gap-[3px]" aria-hidden>
              {energy.map((v, i) => <span key={i} className={cx('flex-1 rounded-full', i === energy.length - 1 ? 'bg-lime' : 'bg-white/45')} style={{ height: `${Math.max(12, (v / peak) * 100)}%` }} />)}
            </div>
            <Sub>{energySub}</Sub>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
