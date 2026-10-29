import { Link } from 'react-router-dom'
import { Card, CardHeader } from '@/components/ui/Card'
import { Gauge } from '@/components/ui/Display'
import { cx } from '@/lib/format'
import { useZoneHealthMap, useZones } from '@/store/hooks'
import type { HealthStatus } from '@/types'

const TILE: Record<HealthStatus, string> = {
  operational: 'border-ok/40 bg-ok/10 text-ok',
  warning: 'border-warn/50 bg-warn/15 text-warn',
  critical: 'border-crit/60 bg-crit/15 text-crit',
  offline: 'border-line bg-card-2 text-dim',
}
const LABEL: Record<HealthStatus, string> = { operational: 'Healthy', warning: 'Warning', critical: 'Critical', offline: 'Idle' }

export function ZoneHealthMap() {
  const zones = useZones()
  const health = useZoneHealthMap()
  const counts = zones.reduce<Record<HealthStatus, number>>((a, z) => ({ ...a, [health[z.id]]: a[health[z.id]] + 1 }), { operational: 0, warning: 0, critical: 0, offline: 0 })
  const active = zones.length - counts.offline
  const pct = active ? (counts.operational / active) * 100 : 0
  const tone = counts.critical ? 'crit' : counts.warning ? 'warn' : 'lime'
  return (
    <Card>
      <CardHeader title="Zone health" subtitle="Live status of every grow zone" action={<Link to="/zones" className="text-[13px] text-lime hover:underline">All zones</Link>} />
      <div className="flex flex-wrap items-center gap-5 p-5">
        <Gauge value={pct} tone={tone} size={128} label={`${counts.operational}/${active}`} sub="zones healthy" />
        <ul className="min-w-0 flex-1 basis-40 grid grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-4" aria-label="Zone health map">
          {zones.map((z) => (
            <li key={z.id}>
              <Link to={`/zones?zone=${z.id}`} title={`Zone ${z.code} — ${LABEL[health[z.id]]}`} aria-label={`Zone ${z.code}, ${LABEL[health[z.id]]}`} className={cx('flex h-11 items-center justify-center rounded-xl border text-[13px] font-medium transition-transform hover:scale-[1.04]', TILE[health[z.id]])}>{z.code}</Link>
            </li>
          ))}
        </ul>
      </div>
      <dl className="flex flex-wrap gap-x-5 gap-y-1 px-5 pb-5 text-xs text-mute">
        {(['operational', 'warning', 'critical', 'offline'] as const).map((s) => <div key={s} className="flex items-center gap-1.5"><span className={cx('size-2 rounded-full', s === 'operational' ? 'bg-ok' : s === 'warning' ? 'bg-warn' : s === 'critical' ? 'bg-crit' : 'bg-dim')} /><dt>{LABEL[s]}</dt><dd className="text-ink">{counts[s]}</dd></div>)}
      </dl>
    </Card>
  )
}
