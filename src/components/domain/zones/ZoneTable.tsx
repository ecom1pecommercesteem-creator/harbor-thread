import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { TableCard, td, th, tr } from '@/components/ui/Display'
import { cx } from '@/lib/format'
import { ReadingValue } from './ZonePrimitives'
import { PUMP_LABEL, type ZoneView } from './zoneView'

const dash = <span className="text-mute">—</span>

function ZoneRow({ view, onOpen }: { view: ZoneView; onOpen: () => void }) {
  const { zone, crop, live, res } = view
  return (
    <tr className={cx(tr, 'cursor-pointer', !crop && 'text-mute')} onClick={onOpen}>
      <th scope="row" className={cx(td, 'font-normal')}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-mute">{zone.code}</span>
          <span className="text-ink">{zone.name}</span>
          {view.stale && <Badge tone="warn" dot>Reading stale</Badge>}
        </div>
      </th>
      <td className={td}>
        {crop ? (
          <>
            {crop.name} <span className="text-mute">· {crop.variety}</span>
          </>
        ) : (
          'Idle — no crop'
        )}
      </td>
      <td className={cx(td, 'whitespace-nowrap text-mute')}>
        {zone.racks}×{zone.shelvesPerRack} · {zone.areaM2} m²
      </td>
      <td className={cx(td, 'whitespace-nowrap')}>{crop && live ? <ReadingValue view={view} metric="temperature" /> : dash}</td>
      <td className={cx(td, 'whitespace-nowrap')}>{crop && live ? <ReadingValue view={view} metric="humidity" /> : dash}</td>
      <td className={cx(td, 'whitespace-nowrap')}>{crop && live ? <ReadingValue view={view} metric="ph" /> : dash}</td>
      <td className={cx(td, 'whitespace-nowrap')}>{crop && live ? <ReadingValue view={view} metric="ec" /> : dash}</td>
      <td className={cx(td, 'whitespace-nowrap')}>{live ? (live.lightsOn ? 'On' : 'Off') : dash}</td>
      <td className={cx(td, 'whitespace-nowrap')}>
        {res ? (
          <>
            {PUMP_LABEL[res.pump]} <span className="text-mute">· {res.levelPct.toFixed(0)} %</span>
          </>
        ) : (
          dash
        )}
      </td>
      <td className={td}>{crop ? <StatusBadge status={view.health} /> : <Badge>Idle</Badge>}</td>
      <td className={td}>
        <Button size="sm" variant="secondary" onClick={onOpen}>
          View
        </Button>
      </td>
    </tr>
  )
}

export function ZoneTable({ views, onOpen }: { views: ZoneView[]; onOpen: (zoneId: string) => void }) {
  return (
    <TableCard>
      <table className="w-full min-w-[1000px] border-collapse">
        <caption className="sr-only">Grow zones in the selected facility</caption>
        <thead>
          <tr>
            <th scope="col" className={th}>Zone</th>
            <th scope="col" className={th}>Crop</th>
            <th scope="col" className={th}>Layout</th>
            <th scope="col" className={th}>Temp</th>
            <th scope="col" className={th}>RH</th>
            <th scope="col" className={th}>pH</th>
            <th scope="col" className={th}>EC</th>
            <th scope="col" className={th}>Lights</th>
            <th scope="col" className={th}>Irrigation</th>
            <th scope="col" className={th}>Health</th>
            <th scope="col" className={th}><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {views.map((v) => (
            <ZoneRow key={v.zone.id} view={v} onOpen={() => onOpen(v.zone.id)} />
          ))}
        </tbody>
      </table>
    </TableCard>
  )
}
