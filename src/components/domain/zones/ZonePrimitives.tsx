import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Reading } from '@/components/ui/Display'
import { cx, useFmt } from '@/lib/format'
import { breachFor, metricDisplay, type ZoneView } from './zoneView'
import type { Metric } from '@/types'

/** A live reading coloured by its breach state (from zoneBreaches) with an ↑/↓ marker. */
export function ReadingValue({ view, metric, className }: { view: ZoneView; metric: Metric; className?: string }) {
  const fmt = useFmt()
  const live = view.live
  if (!live) return <span className="text-mute">—</span>
  if (metric === 'ppfd' && !live.lightsOn) return <span className={cx('text-mute', className)}>Lights off</span>
  const b = breachFor(view, metric)
  const d = metricDisplay(metric, live[metric], fmt)
  const tone = b ? (b.severity === 'critical' ? 'text-crit' : 'text-warn') : undefined
  return (
    <span className={cx('inline-flex items-baseline gap-1 tabular-nums', tone, className)}>
      <Reading value={d.value} unit={d.unit} stale={view.stale} since={view.stale ? fmt.ago(live.updatedAt) : undefined} />
      {b && (
        <span role="img" aria-label={b.side === 'high' ? 'above target' : 'below target'} title={b.side === 'high' ? 'Above target range' : 'Below target range'} className="text-[0.8em] leading-none">
          {b.side === 'high' ? '↑' : '↓'}
        </span>
      )}
    </span>
  )
}

/** Shown when the zone's sensor node is offline: values are frozen at the last fresh reading. */
export function StaleNotice({ view, className }: { view: ZoneView; className?: string }) {
  const fmt = useFmt()
  if (!view.stale || !view.live) return null
  return (
    <div className={cx('flex flex-wrap items-center gap-2', className)}>
      <Badge tone="warn" dot>Reading stale</Badge>
      <span className="text-xs text-mute">Sensor offline · last fresh {fmt.ago(view.live.updatedAt)}</span>
    </div>
  )
}

export function InfoNote({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-line bg-card-2 px-4 py-3 text-sm text-mute">{children}</div>
}
