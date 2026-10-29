import { Link } from 'react-router-dom'
import { StatusBadge } from '@/components/ui/Badge'
import { Reading, TableCard, th, td, tr } from '@/components/ui/Display'
import { useFmt, cx } from '@/lib/format'
import { METRIC_META } from '@/lib/metrics'
import { zoneHealth } from '@/sim/rules'
import type { Metric, Settings, ZoneLive } from '@/types'
import { TABLE_METRICS, cellFor, cropName, type ActiveZone, type Cell } from './envModel'

const TONE = { ok: 'text-ink', warning: 'text-warn', critical: 'text-crit' } as const

function CellValue({ cell }: { cell: Cell }) {
  if (cell.off) return <span className="text-mute">Lights off</span>
  if (cell.stale) return <Reading value={cell.text} stale />
  return (
    <span className={cx('tabular-nums', TONE[cell.verdict])}>
      {cell.arrow && <span aria-hidden className="mr-0.5">{cell.arrow}</span>}
      {cell.text}
      {cell.arrow && <span className="sr-only">{cell.arrow === '↑' ? ' above target' : ' below target'}</span>}
    </span>
  )
}

function header(m: Metric, unit: string): string {
  const u = m === 'ppfd' ? '' : unit
  return u ? `${METRIC_META[m].short} (${u})` : METRIC_META[m].short
}

export function ZonesVsTargets({ zones, live, settings }: { zones: ActiveZone[]; live: Record<string, ZoneLive>; settings: Settings }) {
  const f = useFmt()
  return (
    <TableCard>
      <table className="w-full min-w-[900px] border-collapse">
        <caption className="sr-only">Active zones compared with crop targets</caption>
        <thead>
          <tr>
            <th scope="col" className={th}>Zone</th>
            <th scope="col" className={th}>Crop</th>
            {TABLE_METRICS.map((m) => (
              <th key={m} scope="col" className={th}>{header(m, m === 'temperature' ? f.tempUnit : METRIC_META[m].unit)}</th>
            ))}
            <th scope="col" className={th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {zones.map((z) => {
            const l = live[z.id] as ZoneLive | undefined
            const offline = l !== undefined && !l.sensorOnline
            return (
              <tr key={z.id} className={tr}>
                <th scope="row" className={cx(td, 'text-left font-normal')}>
                  <Link to={`/zones?zone=${z.id}`} className="text-ink hover:text-lime hover:underline">Zone {z.code}</Link>
                </th>
                <td className={cx(td, 'text-mute')}>{cropName(z.cropProfileId)}</td>
                {TABLE_METRICS.map((m) => (
                  <td key={m} className={td}>
                    <CellValue cell={cellFor(z, l, m, settings, f)} />
                  </td>
                ))}
                <td className={td}>
                  <StatusBadge status={zoneHealth(z, l, settings)} label={offline ? 'Sensor offline' : undefined} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </TableCard>
  )
}
