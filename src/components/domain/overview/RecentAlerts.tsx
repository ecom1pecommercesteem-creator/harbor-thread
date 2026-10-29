import { ArrowUpRight, CheckCheck } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AlertStatusBadge, SeverityBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/Display'
import { cx, useFmt } from '@/lib/format'
import { useFarm } from '@/store'
import { useFacilityAlerts } from '@/store/hooks'

const RANK = { critical: 0, warning: 1, info: 2 } as const

export function RecentAlerts() {
  const alerts = useFacilityAlerts()
  const f = useFmt()
  const acknowledge = useFarm((s) => s.acknowledge)
  const markRead = useFarm((s) => s.markRead)
  const open = useMemo(() => alerts.filter((a) => a.status !== 'resolved').sort((a, b) => RANK[a.severity] - RANK[b.severity] || b.createdAt.localeCompare(a.createdAt)), [alerts])
  const shown = open.slice(0, 5)
  return (
    <Card className="flex flex-col">
      <CardHeader title="Recent alerts" subtitle={open.length ? `${open.length} open · sorted by severity` : 'Nothing needs attention'} action={<Link to="/alerts" className="text-[13px] text-lime hover:underline">View all</Link>} />
      <div className="flex-1 p-3">
        {shown.length === 0 ? <EmptyState icon={<CheckCheck className="size-5" />} title="All clear" message="No open warnings or critical issues." /> : (
          <ul className="space-y-1">
            {shown.map((a) => (
              <li key={a.id} className="rounded-2xl p-3 transition-colors hover:bg-card-2">
                <div className="flex items-center gap-2">
                  <span aria-hidden className={cx('size-2 shrink-0 rounded-full', a.read ? 'bg-transparent' : 'bg-lime')} />
                  <SeverityBadge severity={a.severity} /><AlertStatusBadge status={a.status} />
                  <time dateTime={a.createdAt} className="ml-auto whitespace-nowrap text-[11px] text-mute">{f.ago(a.createdAt)}</time>
                </div>
                <Link to={`/alerts?alert=${a.id}`} onClick={() => markRead(a.id)} className="mt-2 block text-[14px] leading-snug hover:text-lime">{a.title}</Link>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-mute">
                  <span>{a.assetLabel}</span>
                  {a.value !== undefined && a.threshold && <span>{a.value}{a.unit ? ` ${a.unit}` : ''} · target {a.threshold}</span>}
                  <span className="ml-auto flex gap-1">
                    {a.status === 'active' && <Button size="sm" variant="ghost" onClick={() => acknowledge(a.id)}>Acknowledge</Button>}
                    {a.assetKind === 'zone' && <Link to={`/zones?zone=${a.assetId}`} className="inline-flex h-8 items-center gap-1 rounded-full px-3 text-[13px] text-mute hover:bg-chip hover:text-ink">Zone<ArrowUpRight aria-hidden className="size-3.5" /></Link>}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}
