import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, BatchStatusBadge, StatusBadge } from '@/components/ui/Badge'
import { InfoRow, Reading, Section, TableCard, TickBar, th, td, tr } from '@/components/ui/Display'
import { Drawer } from '@/components/ui/Overlay'
import { CropBanner } from '@/components/ui/Photo'
import { cx, useFmt } from '@/lib/format'
import { METRIC_META, METRICS } from '@/lib/metrics'
import { classify, effectiveTargets, fmtRange } from '@/sim/rules'
import { useFarm } from '@/store'
import type { HealthStatus, Metric } from '@/types'
import { STAGES, etaLabel, yieldLabel, ageLabel, type BatchRow } from './batchView'

interface Props {
  row: BatchRow
  health: HealthStatus
  onClose: () => void
}

export function BatchDrawer({ row, health, onClose }: Props) {
  const f = useFmt()
  const { batch, crop, zone, status } = row
  const eta = etaLabel(row)
  const currentIdx = STAGES.indexOf(row.stage)

  return (
    <Drawer open onClose={onClose} title={batch.id} subtitle={`${crop.name} · ${crop.variety} · Zone ${zone.code}`} wide>
      <CropBanner category={crop.category} />
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <BatchStatusBadge status={status} />
        <Badge tone="neutral">{row.stage}</Badge>
        {batch.userCreated && <Badge tone="info">User-created (simulated)</Badge>}
      </div>

      <Section title="Batch">
        <dl className="rounded-card border border-line bg-card-2 px-4">
          <InfoRow label="Crop">{crop.name} · {crop.variety}</InfoRow>
          <InfoRow label="Zone">
            <Link to={`/zones?zone=${zone.id}`} className="text-lime hover:underline">Zone {zone.code} · {zone.name}</Link>
          </InfoRow>
          <InfoRow label="Trays">{batch.trays}</InfoRow>
          <InfoRow label="Planted">{f.date(batch.plantedAt)}</InfoRow>
          <InfoRow label="Days since planting">{ageLabel(row)}</InfoRow>
          <InfoRow label="Growth stage">{row.stage}</InfoRow>
          <InfoRow label="Progress to harvest">
            <span className="inline-flex w-40 items-center gap-2"><span className="flex-1"><TickBar value={row.progress} ticks={20} tone={status === 'at-risk' ? 'crit' : status === 'attention' ? 'warn' : 'lime'} /></span><span className="text-xs text-mute">{Math.round(row.progress)}%</span></span>
          </InfoRow>
          <InfoRow label={row.harvested ? 'Harvested' : 'Harvest estimate'}>
            {f.date(batch.harvestedAt ?? batch.harvestEta)}{' '}
            <span className={cx('text-xs', eta.className)}>{eta.text}</span>
          </InfoRow>
          <InfoRow label={row.harvested ? 'Actual yield' : 'Expected yield'}>{yieldLabel(batch)}</InfoRow>
          {row.harvested && <InfoRow label="Loss">{batch.lossKg?.toFixed(1) ?? '0.0'} kg</InfoRow>}
        </dl>
      </Section>

      <Section title="Growth timeline">
        <ol className="space-y-1">
          {STAGES.map((s, i) => {
            const done = i < currentIdx
            const current = i === currentIdx
            return (
              <li
                key={s}
                aria-current={current ? 'step' : undefined}
                className={cx('flex items-center gap-3 rounded-xl px-3 py-2 text-sm', current ? 'bg-chip text-ink' : done ? 'text-ink' : 'text-dim')}
              >
                <span aria-hidden className={cx('size-2.5 shrink-0 rounded-full', current ? 'bg-lime' : done ? 'bg-sage' : 'bg-chip')} />
                <span className="flex-1">{s}</span>
                {current && <span className="text-xs text-lime">current</span>}
              </li>
            )
          })}
        </ol>
      </Section>

      <Section title="Zone conditions" action={<StatusBadge status={health} />}>
        <ZoneConditions row={row} />
      </Section>

      <Section title="Notes">
        <p className="rounded-card border border-line bg-card-2 p-4 text-sm leading-relaxed text-mute">{batch.notes?.trim() || 'No notes recorded for this batch.'}</p>
      </Section>

      <div className="flex flex-wrap gap-5 text-sm">
        <Link to={`/zones?zone=${zone.id}`} className="inline-flex items-center gap-1.5 text-lime hover:underline">
          Open Zone {zone.code} <ArrowRight className="size-3.5" aria-hidden />
        </Link>
        <Link to="/environment" className="inline-flex items-center gap-1.5 text-lime hover:underline">
          Environment history <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </Drawer>
  )
}

function ZoneConditions({ row }: { row: BatchRow }) {
  const f = useFmt()
  const live = useFarm((s) => s.live[row.zone.id])
  const settings = useFarm((s) => s.settings)

  if (!live) return <p className="text-sm text-mute">No live data for this zone yet.</p>

  const targets = effectiveTargets(row.crop.id, settings)
  const stale = !live.sensorOnline

  const display = (m: Metric) => {
    const raw = live[m]
    const meta = METRIC_META[m]
    const r = targets[m]
    if (m === 'temperature') {
      return {
        value: f.tempVal(raw).toFixed(1),
        unit: f.tempUnit,
        range: `${f.tempVal(r.min).toFixed(1)}–${f.tempVal(r.max).toFixed(1)} ${f.tempUnit}`,
      }
    }
    return { value: raw.toFixed(meta.decimals), unit: meta.unit, range: fmtRange(r, meta.unit, meta.decimals) }
  }

  const status = (m: Metric) => {
    if (m === 'ppfd' && !live.lightsOn) return { text: 'Lights off', className: 'text-mute' }
    const c = classify(live[m], targets[m], settings.thresholds.criticalMarginPct)
    if (c.state === 'ok') return { text: 'In range', className: 'text-ok' }
    const side = c.side === 'low' ? 'Below' : 'Above'
    return { text: `${side} target`, className: c.state === 'critical' ? 'text-crit' : 'text-warn' }
  }

  return (
    <>
      {stale && <p className="mb-3 text-sm text-warn">Sensor node offline. Values are stale, last fresh reading {f.ago(live.updatedAt)}.</p>}
      <TableCard>
        <table className="w-full min-w-[420px]">
          <caption className="sr-only">Live zone conditions compared with the crop target ranges</caption>
          <thead>
            <tr>
              <th scope="col" className={th}>Metric</th>
              <th scope="col" className={th}>Live</th>
              <th scope="col" className={th}>Target</th>
              <th scope="col" className={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {METRICS.map((m) => {
              const d = display(m)
              const s = status(m)
              return (
                <tr key={m} className={tr}>
                  <th scope="row" className={cx(td, 'text-left font-normal text-mute')}>{METRIC_META[m].short}</th>
                  <td className={cx(td, 'whitespace-nowrap')}>
                    <Reading value={d.value} unit={d.unit} stale={stale} since={stale ? f.ago(live.updatedAt) : undefined} />
                  </td>
                  <td className={cx(td, 'whitespace-nowrap text-mute')}>{d.range}</td>
                  <td className={cx(td, 'whitespace-nowrap text-xs font-medium', s.className)}>{s.text}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </TableCard>
      <p className="mt-2 text-xs text-dim">Target ranges are illustrative demonstration values, adjustable in Settings.</p>
    </>
  )
}
