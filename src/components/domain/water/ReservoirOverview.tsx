import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState, InfoRow } from '@/components/ui/Display'
import { CROP_BY_ID } from '@/data/seed'
import { useFmt } from '@/lib/format'
import { useFarm } from '@/store'
import type { Reservoir } from '@/types'
import type { ReservoirContext } from './waterModel'

export function ReservoirOverview({ res, ctx }: { res: Reservoir; ctx: ReservoirContext }) {
  const fmt = useFmt()
  const live = useFarm((s) => s.live)
  return (
    <Card>
      <CardHeader title={res.name} subtitle={`Feeds ${ctx.active.length} active of ${ctx.fed.length} zones`} />
      <div className="grid gap-6 p-5 lg:grid-cols-2">
        <dl>
          <InfoRow label="Capacity">{fmt.vol(res.capacityL)}</InfoRow>
          <InfoRow label="Crops">
            {ctx.cropNames.length ? (
              <span className="flex flex-wrap justify-end gap-1.5">
                {ctx.cropNames.map((n) => <Badge key={n} tone="forest">{n}</Badge>)}
              </span>
            ) : (
              <span className="text-mute">None, all zones idle</span>
            )}
          </InfoRow>
        </dl>
        <div className="min-w-0">
          <h3 className="mb-1 text-[13px] uppercase tracking-wider text-mute">Zones fed</h3>
          {ctx.fed.length === 0 ? (
            <EmptyState title="No zones connected" message="No growing zones draw from this reservoir." />
          ) : (
            <ul className="divide-y divide-line/60">
              {ctx.fed.map((z) => {
                const crop = z.cropProfileId ? CROP_BY_ID.get(z.cropProfileId)?.name : undefined
                const offline = !!z.cropProfileId && live[z.id]?.sensorOnline === false
                return (
                  <li key={z.id}>
                    <Link to={`/zones?zone=${z.id}`} className="flex items-center justify-between gap-3 py-2.5 text-sm transition-colors hover:text-lime">
                      <span className="min-w-0 truncate">Zone {z.code} <span className="text-mute">· {z.name}</span></span>
                      {!z.cropProfileId ? <Badge>Idle</Badge> : offline ? <Badge tone="warn" dot>Sensor offline</Badge> : <span className="shrink-0 text-xs text-mute">{crop}</span>}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </Card>
  )
}
