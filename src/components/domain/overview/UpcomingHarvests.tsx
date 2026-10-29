import { differenceInCalendarDays } from 'date-fns'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/Display'
import { CROP_BY_ID, ZONE_BY_ID } from '@/data/seed'
import { useFmt } from '@/lib/format'
import { useFacilityBatches } from '@/store/hooks'

export function UpcomingHarvests() {
  const batches = useFacilityBatches()
  const f = useFmt()
  const upcoming = batches.filter((b) => !b.harvestedAt).sort((a, b) => a.harvestEta.localeCompare(b.harvestEta)).slice(0, 6)
  return (
    <Card>
      <CardHeader title="Upcoming harvests" subtitle="Nearest estimated harvest dates" action={<Link to="/crops" className="text-[13px] text-lime hover:underline">All batches</Link>} />
      <div className="p-3">
        {upcoming.length === 0 ? <EmptyState title="No active batches" message="Add a batch on the Crops & Batches page." /> : (
          <ul>
            {upcoming.map((b) => {
              const days = differenceInCalendarDays(new Date(b.harvestEta), new Date())
              return (
                <li key={b.id}>
                  <Link to={`/crops?batch=${b.id}`} className="flex items-center gap-3 rounded-2xl p-3 hover:bg-card-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm">{CROP_BY_ID.get(b.cropProfileId)?.name}</div>
                      <div className="mt-0.5 truncate text-xs text-mute">Zone {ZONE_BY_ID.get(b.zoneId)?.code} · {b.id}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[13px]">{f.shortDate(b.harvestEta)}</div>
                      {days <= 0 ? <Badge tone="lime">Ready</Badge> : <div className="text-xs text-mute">in {days} day{days === 1 ? '' : 's'}</div>}
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Card>
  )
}
