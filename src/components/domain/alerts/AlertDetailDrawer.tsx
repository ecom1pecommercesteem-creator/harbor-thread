import { AlertStatusBadge, SeverityBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Overlay'
import { InfoRow, Section } from '@/components/ui/Display'
import { useFmt } from '@/lib/format'
import { useFarm } from '@/store'
import type { Alert } from '@/types'
import { ValueBar } from './ValueBar'
import { AlertContext } from './AlertContext'
import { ASSET_KIND_LABEL, alertBand, measureOf, statusSummary } from './alertModel'
import { AssetLink } from './AlertCard'

// Generic demo suggestions only: they are not derived from the alert's diagnostics.
const NEXT_STEPS: Record<Alert['assetKind'], string[]> = {
  zone: ['Check the zone climate controls and sensor readings on the Environment page.', 'Confirm the reading with a manual measurement before acting.', 'Acknowledge while work is in progress, then resolve once the condition clears.'],
  equipment: ['Review the fault log and schedule an inspection.', 'Log a maintenance entry on the Equipment page once work is done.'],
  reservoir: ['Check the reservoir level and the top-up source.', 'Review recent irrigation activity on the Water page.'],
}

interface Props {
  alert: Alert | undefined
  onClose: () => void
  onRequestResolve: (a: Alert) => void
}

export function AlertDetailDrawer({ alert, onClose, onRequestResolve }: Props) {
  const fmt = useFmt()
  const settings = useFarm((s) => s.settings)
  const band = alert ? alertBand(alert, settings) : null
  const m = alert ? measureOf(alert, band, fmt) : null

  const events: { key: string; label: string; at: string; detail?: string }[] = []
  if (alert) {
    events.push({ key: 'raised', label: 'Raised', at: alert.createdAt })
    if (alert.acknowledgedAt) events.push({ key: 'ack', label: 'Acknowledged', at: alert.acknowledgedAt, detail: `by ${alert.acknowledgedBy ?? 'operator'}` })
    if (alert.resolvedAt) {
      events.push(
        alert.resolvedBy === 'system'
          ? { key: 'resolved', label: 'Resolved automatically', at: alert.resolvedAt, detail: 'condition cleared' }
          : { key: 'resolved', label: 'Resolved', at: alert.resolvedAt, detail: 'marked resolved by you' },
      )
    }
  }

  return (
    <Drawer
      open={!!alert}
      onClose={onClose}
      wide
      title={alert?.title ?? 'Alert'}
      subtitle={alert && `${ASSET_KIND_LABEL[alert.assetKind]} · ${alert.assetLabel} · ${fmt.ago(alert.createdAt)}`}
      footer={
        alert && (
          <>
            <Button variant="secondary" disabled={alert.status !== 'active'} onClick={() => useFarm.getState().acknowledge(alert.id)}>Acknowledge</Button>
            <Button variant="primary" disabled={alert.status === 'resolved'} onClick={() => onRequestResolve(alert)}>Resolve</Button>
          </>
        )
      }
    >
      {alert && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={alert.severity} />
            <AlertStatusBadge status={alert.status} />
          </div>

          <p className="text-sm leading-relaxed text-ink">{alert.description}</p>

          <dl>
            <InfoRow label="Affected asset"><AssetLink alert={alert} /></InfoRow>
            <InfoRow label="Status">{statusSummary(alert, fmt)}</InfoRow>
            <InfoRow label="Rule">{alert.ruleKey ? <span className="font-mono text-xs">{alert.ruleKey}</span> : 'Manual'}</InfoRow>
          </dl>

          <Section title="Measurement">
            {m && alert.value !== undefined ? (
              <div className="space-y-4 rounded-card border border-line p-4">
                <p className="text-[34px] font-light leading-none tabular-nums">{m.value}</p>
                <ValueBar
                  value={m.numeric}
                  band={m.band}
                  domain={alert.assetKind === 'reservoir' ? { min: 0, max: 100 } : undefined}
                  text={m.value}
                  severity={alert.severity}
                  label="Measured value against configured range"
                />
                <dl>
                  <InfoRow label={m.band ? 'Target' : 'Threshold'}><span className="tabular-nums">{m.target ?? '—'}</span></InfoRow>
                </dl>
              </div>
            ) : (
              <p className="text-sm text-mute">This alert has no numeric reading.{alert.threshold ? ` Configured: ${alert.threshold}.` : ''}</p>
            )}
          </Section>

          <Section title="Timeline">
            <ol className="space-y-4 border-l border-line pl-5">
              {events.map((e) => (
                <li key={e.key} className="relative">
                  <span aria-hidden className="absolute -left-[25px] top-1.5 size-2.5 rounded-full bg-lime" />
                  <p className="text-sm text-ink">{e.label}</p>
                  <p className="text-xs text-dim">{fmt.dateTime(e.at)}{e.detail ? ` · ${e.detail}` : ''}</p>
                </li>
              ))}
            </ol>
          </Section>

          <Section title="Context">
            <AlertContext alert={alert} />
          </Section>

          <Section title="Possible next steps">
            <p className="mb-2 text-xs text-dim">Generic demo suggestions, not a diagnosis of this alert.</p>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-mute">
              {NEXT_STEPS[alert.assetKind].map((s) => <li key={s}>{s}</li>)}
            </ul>
          </Section>
        </div>
      )}
    </Drawer>
  )
}
