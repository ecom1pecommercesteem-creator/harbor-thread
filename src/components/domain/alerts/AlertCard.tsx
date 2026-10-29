import { Link } from 'react-router-dom'
import { AlertStatusBadge, SeverityBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cx, useFmt } from '@/lib/format'
import { useFarm } from '@/store'
import type { Alert } from '@/types'
import { alertBand, assetHref, measureOf, statusSummary } from './alertModel'

export function AssetLink({ alert, className }: { alert: Alert; className?: string }) {
  return (
    <Link to={assetHref(alert)} className={cx('text-ink underline decoration-dim underline-offset-4 hover:decoration-lime', className)}>
      {alert.assetLabel}
    </Link>
  )
}

interface Props {
  alert: Alert
  onOpen: (id: string) => void
  onRequestResolve: (a: Alert) => void
}

export function AlertCard({ alert: a, onOpen, onRequestResolve }: Props) {
  const fmt = useFmt()
  const settings = useFarm((s) => s.settings)
  const m = measureOf(a, alertBand(a, settings), fmt)
  const unread = !a.read && a.status !== 'resolved'

  return (
    <li className="rounded-card border border-line bg-card p-5 transition-colors hover:border-dim">
      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge severity={a.severity} />
        <AlertStatusBadge status={a.status} />
        {unread && <span role="img" aria-label="Unread" title="Unread" className="size-2 rounded-full bg-lime" />}
        <time dateTime={a.createdAt} title={fmt.dateTime(a.createdAt)} className="ml-auto text-xs text-dim">{fmt.ago(a.createdAt)}</time>
      </div>

      <h3 className="mt-3 text-base leading-snug">
        <button type="button" onClick={() => onOpen(a.id)} className="text-left text-ink hover:text-lime">{a.title}</button>
      </h3>
      <p className="mt-1.5 line-clamp-2 text-sm text-mute">{a.description}</p>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-dim">Asset</dt>
          <dd className="mt-0.5"><AssetLink alert={a} /></dd>
        </div>
        <div>
          <dt className="text-xs text-dim">Measured</dt>
          <dd className="mt-0.5 tabular-nums">{m ? m.value : '—'}</dd>
        </div>
        <div>
          <dt className="text-xs text-dim">{m?.band ? 'Target' : 'Threshold'}</dt>
          <dd className="mt-0.5 tabular-nums">{m ? (m.target ?? '—') : (a.threshold ?? '—')}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line/70 pt-4">
        <p className="text-xs text-dim">{statusSummary(a, fmt)}</p>
        <div className="flex gap-2">
          {a.status === 'active' && (
            <Button size="sm" variant="secondary" onClick={() => useFarm.getState().acknowledge(a.id)}>Acknowledge</Button>
          )}
          {a.status !== 'resolved' && (
            <Button size="sm" variant="ghost" onClick={() => onRequestResolve(a)}>Resolve</Button>
          )}
        </div>
      </div>
    </li>
  )
}
