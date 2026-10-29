import { ArrowUpRight, Inbox, WifiOff } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useId, type ReactNode } from 'react'
import { cx } from '@/lib/format'
import { SimTag } from './Badge'
import { Card } from './Card'

export function PageHeader({ title, description, actions, sim = true }: { title: string; description?: ReactNode; actions?: ReactNode; sim?: boolean }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="flex flex-wrap items-center gap-3 text-[28px] font-light leading-tight sm:text-[34px]">{title}{sim && <SimTag />}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-mute">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function EmptyState({ title, message, action, icon }: { title: string; message?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-line px-6 py-14 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-chip text-mute">{icon ?? <Inbox className="size-5" />}</div>
      <h3 className="text-base font-normal">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-mute">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/** Orion-style stat tile: label, big light-weight number, supporting line, arrow-in-circle link. */
export function Kpi({ label, value, unit, sub, icon, to, tone }: { label: string; value: ReactNode; unit?: string; sub?: ReactNode; icon?: ReactNode; to?: string; tone?: 'warn' | 'crit' }) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-2 text-[13px] text-mute">{icon}{label}</span>
        {to && <span aria-hidden className="flex size-7 items-center justify-center rounded-full bg-chip text-mute transition-colors group-hover:bg-lime group-hover:text-lime-ink"><ArrowUpRight className="size-3.5" /></span>}
      </div>
      <div className="mt-4 flex items-baseline gap-1.5">
        <span className={cx('text-[38px] font-light leading-none tracking-tight', tone === 'crit' ? 'text-crit' : tone === 'warn' ? 'text-warn' : 'text-ink')}>{value}</span>
        {unit && <span className="text-sm text-mute">{unit}</span>}
      </div>
      {sub && <div className="mt-2.5 text-xs text-mute">{sub}</div>}
    </>
  )
  const cls = 'group block rounded-card border border-line bg-card p-5 transition-colors'
  return to ? <Link to={to} className={cx(cls, 'hover:border-dim')}>{body}</Link> : <div className={cls}>{body}</div>
}

/** Tick-mark ring gauge (Orion reference). value is 0–100. */
export function Gauge({ value, label, sub, size = 132, tone = 'lime' }: { value: number; label: ReactNode; sub?: string; size?: number; tone?: 'lime' | 'warn' | 'crit' | 'ok' }) {
  const id = useId()
  const v = Math.max(0, Math.min(100, value))
  const color = { lime: 'var(--color-lime)', warn: 'var(--color-warn)', crit: 'var(--color-crit)', ok: 'var(--color-ok)' }[tone]
  const R = 46, C = 2 * Math.PI * R
  const ticks = 48
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={`${sub ?? 'Value'} ${Math.round(v)} percent`}>
      <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90" aria-hidden>
        {Array.from({ length: ticks }, (_, i) => {
          const a = (i / ticks) * Math.PI * 2
          const filled = i / ticks < v / 100
          return <line key={`${id}${i}`} x1={60 + Math.cos(a) * 52} y1={60 + Math.sin(a) * 52} x2={60 + Math.cos(a) * 57} y2={60 + Math.sin(a) * 57} stroke={filled ? color : 'var(--color-chip)'} strokeWidth="1.6" strokeLinecap="round" />
        })}
        <circle cx="60" cy="60" r={R} fill="none" stroke="var(--color-card-2)" strokeWidth="5" />
        <circle cx="60" cy="60" r={R} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(C * v) / 100} ${C}`} className="transition-[stroke-dasharray] duration-700" />
      </svg>
      <div className="text-center leading-tight">
        <div className="text-[26px] font-light">{label}</div>
        {sub && <div className="text-[11px] text-mute">{sub}</div>}
      </div>
    </div>
  )
}

/** Segmented tick progress bar (Orion reference). */
export function TickBar({ value, ticks = 40, tone = 'lime' }: { value: number; ticks?: number; tone?: 'lime' | 'warn' | 'crit' | 'ok' }) {
  const filled = Math.round((Math.max(0, Math.min(100, value)) / 100) * ticks)
  const color = { lime: 'bg-lime', warn: 'bg-warn', crit: 'bg-crit', ok: 'bg-ok' }[tone]
  return (
    <div className="flex h-5 items-stretch gap-[3px]" role="img" aria-label={`${Math.round(value)} percent`}>
      {Array.from({ length: ticks }, (_, i) => <span key={i} className={cx('w-[3px] flex-1 rounded-full', i < filled ? color : 'bg-chip')} />)}
    </div>
  )
}

/** A sensor value that degrades to "stale" when the node is offline. */
export function Reading({ value, unit, stale, since, className }: { value: string; unit?: string; stale?: boolean; since?: string; className?: string }) {
  if (stale) {
    return <span className={cx('inline-flex items-center gap-1 text-mute', className)} title={since ? `Stale — last fresh reading ${since}` : 'Stale'}><WifiOff aria-hidden className="size-3.5" /><span className="line-through decoration-dim/60">{value}</span><span className="text-[11px] text-warn">stale</span></span>
  }
  return <span className={className}>{value}{unit && <span className="ml-0.5 text-[0.7em] text-mute">{unit}</span>}</span>
}

export function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line/60 py-2.5 text-sm last:border-0">
      <dt className="text-mute">{label}</dt>
      <dd className="text-right text-ink">{children}</dd>
    </div>
  )
}

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="mb-6">
      <div className="mb-2.5 flex items-center justify-between"><h3 className="text-[13px] uppercase tracking-wider text-mute">{title}</h3>{action}</div>
      {children}
    </section>
  )
}

export const TableCard = ({ children, className }: { children: ReactNode; className?: string }) => (
  <Card className={cx('overflow-hidden', className)}><div className="overflow-x-auto">{children}</div></Card>
)
export const th = 'whitespace-nowrap px-4 py-3 text-left text-xs font-normal uppercase tracking-wider text-mute'
export const td = 'px-4 py-3.5 text-sm'
export const tr = 'border-t border-line/70 transition-colors hover:bg-card-2'
