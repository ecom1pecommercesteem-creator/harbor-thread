import { Section } from '@/components/ui/Display'
import { cx, useFmt } from '@/lib/format'
import { METRIC_META } from '@/lib/metrics'
import type { Metric } from '@/types'
import { InfoNote, ReadingValue } from './ZonePrimitives'
import { breachFor, METRIC_ORDER, rangeDisplay, type ZoneView } from './zoneView'

function ConditionTile({ view, metric }: { view: ZoneView; metric: Metric }) {
  const fmt = useFmt()
  const range = view.targets?.[metric]
  const b = breachFor(view, metric)
  const status = view.stale
    ? { text: 'Stale — sensor offline', tone: 'text-mute' }
    : metric === 'ppfd' && view.live && !view.live.lightsOn
      ? { text: 'Lights off — not evaluated', tone: 'text-mute' }
      : b
        ? { text: `${b.side === 'high' ? 'Above' : 'Below'} target`, tone: b.severity === 'critical' ? 'text-crit' : 'text-warn' }
        : { text: 'In range', tone: 'text-ok' }
  return (
    <div className="rounded-xl border border-line bg-card-2 p-4">
      <div className="text-xs text-mute">{METRIC_META[metric].label}</div>
      <div className="mt-2 text-[26px] font-light leading-none">
        <ReadingValue view={view} metric={metric} />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
        <span className={cx(status.tone)}>{status.text}</span>
        {range && <span className="text-mute">Target {rangeDisplay(metric, range, fmt)}</span>}
      </div>
    </div>
  )
}

export function ZoneConditions({ view }: { view: ZoneView }) {
  if (!view.crop) {
    return (
      <Section title="Current conditions">
        <InfoNote>Idle — no crop is assigned, so this zone has no live readings or targets.</InfoNote>
      </Section>
    )
  }
  return (
    <Section title="Current conditions">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {METRIC_ORDER.map((m) => (
          <ConditionTile key={m} view={view} metric={m} />
        ))}
      </div>
      <p className="mt-3 text-xs text-dim">Targets are illustrative demo values.</p>
    </Section>
  )
}
