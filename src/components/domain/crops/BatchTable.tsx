import { ArrowDown, ArrowDownUp, ArrowUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BatchStatusBadge } from '@/components/ui/Badge'
import { TableCard, TickBar, th, td, tr } from '@/components/ui/Display'
import { cx, useFmt } from '@/lib/format'
import { ageLabel, etaLabel, yieldLabel, type BatchRow, type Sort, type SortKey } from './batchView'

interface Props {
  rows: BatchRow[]
  sort: Sort
  onSortKey: (key: SortKey) => void
  onOpen: (id: string) => void
}

export function BatchTable({ rows, sort, onSortKey, onOpen }: Props) {
  const f = useFmt()
  const head = (label: string, key: SortKey) => {
    const active = sort.key === key
    const Icon = !active ? ArrowDownUp : sort.dir === 'asc' ? ArrowUp : ArrowDown
    return (
      <th scope="col" className={th} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
        <button type="button" onClick={() => onSortKey(key)} className="inline-flex items-center gap-1.5 hover:text-ink">
          {label}
          <Icon aria-hidden className={cx('size-3.5', active ? 'text-lime' : 'text-dim')} />
        </button>
      </th>
    )
  }

  return (
    <TableCard>
      <table className="w-full min-w-[960px]">
        <caption className="sr-only">Crop batches for the selected facility</caption>
        <thead className="bg-card-2">
          <tr>
            {head('Batch', 'id')}
            <th scope="col" className={th}>Crop</th>
            <th scope="col" className={th}>Zone</th>
            <th scope="col" className={th}>Stage</th>
            {head('Planted', 'planted')}
            {head('Days', 'days')}
            <th scope="col" className={th}>Progress</th>
            {head('Harvest ETA', 'eta')}
            {head('Yield', 'yield')}
            <th scope="col" className={th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const { batch, crop, zone } = r
            const eta = etaLabel(r)
            return (
              <tr key={batch.id} className={tr}>
                <th scope="row" className={cx(td, 'whitespace-nowrap text-left font-medium')}>
                  <button type="button" onClick={() => onOpen(batch.id)} className="hover:text-lime">{batch.id}</button>
                </th>
                <td className={td}>
                  <div>{crop.name}</div>
                  <div className="text-xs text-mute">{crop.variety}</div>
                </td>
                <td className={cx(td, 'whitespace-nowrap')}>
                  <Link to={`/zones?zone=${zone.id}`} className="text-lime hover:underline">Zone {zone.code}</Link>
                </td>
                <td className={cx(td, 'whitespace-nowrap')}>{r.stage}</td>
                <td className={cx(td, 'whitespace-nowrap')}>{f.shortDate(batch.plantedAt)}</td>
                <td className={cx(td, 'whitespace-nowrap')}>{ageLabel(r)}</td>
                <td className={td}><div className="w-28"><TickBar value={r.progress} ticks={20} tone={r.status === 'at-risk' ? 'crit' : r.status === 'attention' ? 'warn' : r.harvested ? 'ok' : 'lime'} /></div></td>
                <td className={cx(td, 'whitespace-nowrap')}>
                  {f.shortDate(batch.harvestedAt ?? batch.harvestEta)}
                  <span className={cx('ml-2 text-xs', eta.className)}>{eta.text}</span>
                </td>
                <td className={cx(td, 'whitespace-nowrap')}>{yieldLabel(batch)}</td>
                <td className={td}><BatchStatusBadge status={r.status} /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </TableCard>
  )
}
