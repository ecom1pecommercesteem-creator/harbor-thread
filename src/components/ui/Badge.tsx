import type { ReactNode } from 'react'
import { cx } from '@/lib/format'
import type { AlertStatus, BatchStatus, HealthStatus, Severity } from '@/types'

export type Tone = 'neutral' | 'lime' | 'ok' | 'warn' | 'crit' | 'info' | 'forest'
const TONE: Record<Tone, string> = {
  neutral: 'bg-chip text-mute',
  lime: 'bg-lime text-lime-ink',
  ok: 'bg-ok/15 text-ok',
  warn: 'bg-warn/15 text-warn',
  crit: 'bg-crit/15 text-crit',
  info: 'bg-info/15 text-info',
  forest: 'bg-forest text-sage',
}
const DOT: Record<Tone, string> = { neutral: 'bg-dim', lime: 'bg-lime-ink', ok: 'bg-ok', warn: 'bg-warn', crit: 'bg-crit', info: 'bg-info', forest: 'bg-sage' }

export function Badge({ tone = 'neutral', dot, children, className }: { tone?: Tone; dot?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-medium leading-none', TONE[tone], className)}>
      {dot && <span aria-hidden className={cx('size-1.5 rounded-full', DOT[tone])} />}
      {children}
    </span>
  )
}

export const HEALTH_TONE: Record<HealthStatus, Tone> = { operational: 'ok', warning: 'warn', critical: 'crit', offline: 'neutral' }
const HEALTH_LABEL: Record<HealthStatus, string> = { operational: 'Operational', warning: 'Warning', critical: 'Critical', offline: 'Offline' }
export const StatusBadge = ({ status, label }: { status: HealthStatus; label?: string }) => (
  <Badge tone={HEALTH_TONE[status]} dot>{label ?? HEALTH_LABEL[status]}</Badge>
)

export const SEVERITY_TONE: Record<Severity, Tone> = { critical: 'crit', warning: 'warn', info: 'info' }
export const SeverityBadge = ({ severity }: { severity: Severity }) => (
  <Badge tone={SEVERITY_TONE[severity]} dot className="capitalize">{severity}</Badge>
)

const ALERT_TONE: Record<AlertStatus, Tone> = { active: 'ok', acknowledged: 'warn', resolved: 'neutral' }
export const AlertStatusBadge = ({ status }: { status: AlertStatus }) => <Badge tone={ALERT_TONE[status]} className="capitalize">{status}</Badge>

const BATCH_TONE: Record<BatchStatus, Tone> = { healthy: 'ok', attention: 'warn', 'at-risk': 'crit', harvested: 'neutral' }
const BATCH_LABEL: Record<BatchStatus, string> = { healthy: 'Healthy', attention: 'Needs attention', 'at-risk': 'At risk', harvested: 'Harvested' }
export const BatchStatusBadge = ({ status }: { status: BatchStatus }) => <Badge tone={BATCH_TONE[status]} dot>{BATCH_LABEL[status]}</Badge>

/** Always-visible marker that data is simulated. */
export const SimTag = ({ className }: { className?: string }) => (
  <span className={cx('inline-flex items-center gap-1 rounded-full border border-lime/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-lime', className)}>Simulated</span>
)
