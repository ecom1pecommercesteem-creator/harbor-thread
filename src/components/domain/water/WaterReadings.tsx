import { Badge, type Tone } from '@/components/ui/Badge'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState, Gauge, Reading } from '@/components/ui/Display'
import { cx, useFmt } from '@/lib/format'
import { fmtRange } from '@/sim/rules'
import { useFarm } from '@/store'
import type { Reservoir } from '@/types'
import { WATER_TEMP_TARGET, describeDelta, type Delta, type ReservoirContext, type SharedTarget } from './waterModel'

const STATE_TONE: Record<Exclude<Delta['state'], 'ok'>, Tone> = { warning: 'warn', critical: 'crit' }

function targetLines(t: SharedTarget | null, decimals: number, idle: string): string[] {
  if (!t) return [idle]
  if (t.shared) return [`Shared recipe ${fmtRange(t.shared, '', decimals)}`, `Crop envelope ${fmtRange(t.envelope, '', decimals)}`]
  return [`Crops have no overlapping range, compromise recipe ${fmtRange(t.target, '', decimals)}`, `Crop envelope ${fmtRange(t.envelope, '', decimals)}`]
}

function ParamCard({ label, value, unit, stale, delta, lines }: { label: string; value: string; unit?: string; stale?: boolean; delta: Delta | null; lines: string[] }) {
  const state = delta?.state ?? 'ok'
  const badge = !delta ? (
    <Badge>No target</Badge>
  ) : delta.state === 'ok' ? (
    <Badge tone="ok" dot>Within range</Badge>
  ) : (
    <Badge tone={STATE_TONE[delta.state]} dot>Out of range</Badge>
  )
  return (
    <div className={cx('flex flex-col rounded-card border bg-card p-5', state === 'critical' ? 'border-crit/60' : state === 'warning' ? 'border-warn/60' : 'border-line')}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] text-mute">{label}</span>
        {badge}
      </div>
      <div className={cx('mt-4 text-[34px] font-light leading-none', state === 'critical' ? 'text-crit' : state === 'warning' ? 'text-warn' : 'text-ink')}>
        <Reading value={value} unit={unit} stale={stale} />
      </div>
      <ul className="mt-4 space-y-1 text-xs text-mute">
        {lines.map((l) => <li key={l}>{l}</li>)}
      </ul>
    </div>
  )
}

export function WaterReadings({ res, ctx }: { res: Reservoir; ctx: ReservoirContext }) {
  const fmt = useFmt()
  const rl = useFarm((s) => s.resLive[res.id])
  const thresholds = useFarm((s) => s.settings.thresholds)
  const { criticalMarginPct, reservoirLowPct, reservoirCriticalPct } = thresholds

  if (!rl) {
    return (
      <Card>
        <CardHeader title="Current readings" />
        <div className="p-5"><EmptyState title="No live readings" message="This reservoir has not reported a reading yet." /></div>
      </Card>
    )
  }

  const levelL = (rl.levelPct / 100) * res.capacityL
  const levelTone = rl.levelPct < reservoirCriticalPct ? 'crit' : rl.levelPct < reservoirLowPct ? 'warn' : 'lime'
  const levelLabel = rl.levelPct < reservoirCriticalPct ? 'Critical' : rl.levelPct < reservoirLowPct ? 'Low' : 'Normal'
  const offlineNote = ctx.allSensorsOffline ? 'pH/EC based on last known values' : null
  const idleNote = 'No active crops feed this reservoir, so there is no target range.'

  const phDelta = ctx.ph ? describeDelta(rl.ph, ctx.ph.target, criticalMarginPct, 2) : null
  const ecDelta = ctx.ec ? describeDelta(rl.ec, ctx.ec.target, criticalMarginPct, 2) : null
  const wt = { min: fmt.tempVal(WATER_TEMP_TARGET.min), max: fmt.tempVal(WATER_TEMP_TARGET.max) }
  const wtDelta = describeDelta(fmt.tempVal(rl.waterTemp), wt, criticalMarginPct, 1, fmt.tempUnit)

  return (
    <Card>
      <CardHeader
        title="Current readings"
        subtitle={`Targets are illustrative demonstration data.${ctx.active.length ? '' : ' No active crops feed this reservoir.'}`}
      />
      <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
        <div className="flex flex-col items-center justify-center gap-3 rounded-card border border-line bg-card p-5 text-center">
          <Gauge value={rl.levelPct} label={`${Math.round(rl.levelPct)}%`} sub="Water level" tone={levelTone} />
          <div>
            <div className="text-sm">{fmt.vol(levelL)} of {fmt.vol(res.capacityL)}</div>
            <div className="text-xs text-mute">{levelLabel} · low below {reservoirLowPct}%, critical below {reservoirCriticalPct}%</div>
          </div>
        </div>
        <ParamCard
          label="pH"
          value={rl.ph.toFixed(2)}
          stale={ctx.allSensorsOffline}
          delta={phDelta}
          lines={[...(phDelta ? [phDelta.text] : []), ...targetLines(ctx.ph, 2, idleNote), ...(offlineNote ? [offlineNote] : [])]}
        />
        <ParamCard
          label="EC"
          value={rl.ec.toFixed(2)}
          unit="mS/cm"
          stale={ctx.allSensorsOffline}
          delta={ecDelta}
          lines={[...(ecDelta ? [ecDelta.text] : []), ...targetLines(ctx.ec, 2, idleNote), ...(offlineNote ? [offlineNote] : [])]}
        />
        <ParamCard
          label="Water temperature"
          value={fmt.tempVal(rl.waterTemp).toFixed(1)}
          unit={fmt.tempUnit}
          delta={wtDelta}
          lines={[wtDelta.text, `Illustrative target ${fmtRange(wt, '', 1)} ${fmt.tempUnit} (demo)`]}
        />
      </div>
    </Card>
  )
}
