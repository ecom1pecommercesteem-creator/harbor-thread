import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Reading } from '@/components/ui/Display'
import { cx } from '@/lib/format'
import type { MetricCard, Verdict } from './envModel'

const VALUE_TONE: Record<Verdict, string> = { ok: 'text-ink', warning: 'text-warn', critical: 'text-crit' }
const DETAIL_TONE: Record<Verdict, string> = { ok: 'text-mute', warning: 'text-warn', critical: 'text-crit' }
const MARKER: Record<Verdict, string> = { ok: 'bg-ok', warning: 'bg-warn', critical: 'bg-crit' }

function StateBadge({ card }: { card: MetricCard }) {
  if (card.lightsOff) return <Badge>Lights off</Badge>
  if (card.stale) return <Badge>Stale</Badge>
  if (card.noData || !card.verdict) return <Badge>No data</Badge>
  if (card.verdict === 'ok') return <Badge tone="ok" dot>In range</Badge>
  return <Badge tone={card.verdict === 'critical' ? 'crit' : 'warn'} dot>OUT OF RANGE</Badge>
}

export function SensorCard({ card }: { card: MetricCard }) {
  const { verdict, value, unit } = card
  const tone = verdict ? VALUE_TONE[verdict] : 'text-ink'
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[13px] text-mute">{card.label}</h3>
        <StateBadge card={card} />
      </div>

      <div className="mt-4 flex min-h-[38px] items-baseline gap-1.5">
        {value === null ? (
          <span className="text-[26px] font-light leading-none text-mute">{card.lightsOff ? 'Lights off' : 'No data'}</span>
        ) : card.stale ? (
          <Reading value={`${value} ${unit}`.trim()} stale />
        ) : (
          <>
            <span className={cx('text-[34px] font-light leading-none tracking-tight', tone)}>{value}</span>
            {unit && <span className="text-sm text-mute">{unit}</span>}
          </>
        )}
      </div>

      {card.detail && <p className={cx('mt-2 text-xs', DETAIL_TONE[verdict ?? 'ok'])}>{card.detail}</p>}
      {card.note && <p className={cx('mt-2 text-xs', card.stale ? 'text-warn' : 'text-dim')}>{card.note}</p>}

      {card.position !== null && (
        <div className="relative mt-4 h-2 rounded-full bg-chip" role="img" aria-label={`Position ${Math.round(card.position * 100)} percent across the scale. Shaded middle half is the target band.`}>
          <span className="absolute inset-y-0 left-1/4 right-1/4 rounded-full bg-ok/25" />
          <span className={cx('absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full', MARKER[verdict ?? 'ok'])} style={{ left: `${card.position * 100}%` }} />
        </div>
      )}

      <p className="mt-auto border-t border-line/60 pt-3 text-xs text-mute">{card.targetText}</p>
    </Card>
  )
}
