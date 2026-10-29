import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { TableCard, td, th, tr } from '@/components/ui/Display'
import { cx, useFmt } from '@/lib/format'
import type { Equipment } from '@/types'
import { dueInfo, locationOf, recentFaults, TYPE_META, type SortKey, type SortState } from './model'

interface Props {
  rows: Equipment[]
  now: number
  sort: SortState
  onSort: (key: SortKey) => void
  onOpen: (id: string) => void
}

export function EquipmentTable({ rows, now, sort, onSort, onOpen }: Props) {
  return (
    <TableCard>
      <table className="w-full min-w-[980px] border-collapse">
        <caption className="sr-only">Equipment inventory for the selected facility</caption>
        <thead>
          <tr>
            <SortHeader label="Name" col="name" sort={sort} onSort={onSort} />
            <SortHeader label="ID" col="id" sort={sort} onSort={onSort} />
            <SortHeader label="Type" col="type" sort={sort} onSort={onSort} />
            <th scope="col" className={th}>Location</th>
            <SortHeader label="Status" col="status" sort={sort} onSort={onSort} />
            <SortHeader label="Last communication" col="lastSeen" sort={sort} onSort={onSort} />
            <SortHeader label="Maintenance due" col="maintenanceDue" sort={sort} onSort={onSort} />
            <th scope="col" className={th}>Faults (14 d)</th>
            <th scope="col" className={th}><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((eq) => (
            <EquipmentRow key={eq.id} eq={eq} now={now} onOpen={onOpen} />
          ))}
        </tbody>
      </table>
    </TableCard>
  )
}

function SortHeader({ label, col, sort, onSort }: { label: string; col: SortKey; sort: SortState; onSort: (k: SortKey) => void }) {
  const active = sort.key === col
  const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown
  return (
    <th scope="col" className={th} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => onSort(col)} className={cx('inline-flex items-center gap-1.5 uppercase tracking-wider hover:text-ink', active && 'text-ink')}>
        {label}
        <Icon aria-hidden className="size-3.5" />
      </button>
    </th>
  )
}

function EquipmentRow({ eq, now, onOpen }: { eq: Equipment; now: number; onOpen: (id: string) => void }) {
  const f = useFmt()
  const loc = locationOf(eq)
  const Icon = TYPE_META[eq.type].icon
  const offline = eq.status === 'offline'
  const due = dueInfo(eq.maintenanceDue, now)
  const faults = recentFaults(eq, now)

  return (
    <tr className={cx(tr, 'cursor-pointer', offline && 'bg-chip/25')} onClick={() => onOpen(eq.id)}>
      <td className={td}>
        <span className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-chip text-mute">
            <Icon aria-hidden className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block whitespace-nowrap font-normal">{eq.name}</span>
            <span className="block whitespace-nowrap text-xs text-dim">{eq.model}</span>
          </span>
        </span>
      </td>
      <td className={cx(td, 'font-mono text-xs text-mute')}>{eq.id}</td>
      <td className={cx(td, 'whitespace-nowrap text-mute')}>{TYPE_META[eq.type].label}</td>
      <td className={cx(td, 'whitespace-nowrap')}>
        {loc.zoneId ? (
          <Link to={`/zones?zone=${loc.zoneId}`} onClick={(e) => e.stopPropagation()} className="text-lime hover:underline">{loc.label}</Link>
        ) : (
          loc.label
        )}
      </td>
      <td className={td}><StatusBadge status={eq.status} /></td>
      <td className={cx(td, 'whitespace-nowrap')}>
        <span className={cx(offline && 'text-warn')}>{f.ago(eq.lastSeen)}</span>
        {offline && <span className="block text-xs text-warn">no heartbeat</span>}
      </td>
      <td className={cx(td, 'whitespace-nowrap')}>
        <span className="block">{f.shortDate(eq.maintenanceDue)}</span>
        <span className={cx('text-xs', due.overdue ? 'text-crit' : due.soon ? 'text-warn' : 'text-mute')}>{due.label}</span>
      </td>
      <td className={cx(td, 'whitespace-nowrap')}>
        {faults.length === 0 ? (
          <span className="text-dim">None</span>
        ) : (
          <span className="flex items-center gap-2">
            <span>{faults.length}</span>
            <Badge tone="warn">{faults[0].code}</Badge>
          </span>
        )}
      </td>
      <td className={td}>
        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onOpen(eq.id) }}>Details</Button>
      </td>
    </tr>
  )
}
