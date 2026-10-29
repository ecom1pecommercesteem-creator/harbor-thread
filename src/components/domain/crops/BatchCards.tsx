import { Link } from 'react-router-dom'
import { BatchStatusBadge } from '@/components/ui/Badge'
import { CropThumb } from '@/components/ui/Photo'
import { Card } from '@/components/ui/Card'
import { TickBar } from '@/components/ui/Display'
import { useFmt } from '@/lib/format'
import type { BatchStatus } from '@/types'
import { ageLabel, etaLabel, yieldLabel, type BatchRow } from './batchView'

const TICK_TONE: Record<BatchStatus, 'lime' | 'warn' | 'crit' | 'ok'> = { healthy: 'lime', attention: 'warn', 'at-risk': 'crit', harvested: 'ok' }

export function BatchCards({ rows, onOpen }: { rows: BatchRow[]; onOpen: (id: string) => void }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((r) => (
        <li key={r.batch.id}>
          <BatchCard row={r} onOpen={onOpen} />
        </li>
      ))}
    </ul>
  )
}

function BatchCard({ row, onOpen }: { row: BatchRow; onOpen: (id: string) => void }) {
  const f = useFmt()
  const { batch, crop, zone, status } = row
  const eta = etaLabel(row)
  return (
    <Card className="flex h-full flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <CropThumb category={crop.category} />
          <div className="min-w-0">
            <button type="button" onClick={() => onOpen(batch.id)} className="truncate text-left text-[15px] font-medium hover:text-lime">
              {batch.id}
            </button>
            <p className="truncate text-[13px] text-mute">{crop.name} · {crop.variety}</p>
          </div>
        </div>
        <BatchStatusBadge status={status} />
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <Link to={`/zones?zone=${zone.id}`} className="text-lime hover:underline">Zone {zone.code}</Link>
        <span aria-hidden className="text-dim">·</span>
        <span>{row.stage}</span>
        <span aria-hidden className="text-dim">·</span>
        <span className="text-mute">{ageLabel(row)} since planting</span>
      </div>

      <TickBar value={row.progress} tone={TICK_TONE[status]} />

      <dl className="mt-auto grid grid-cols-3 gap-3 border-t border-line/60 pt-4 text-sm">
        <div>
          <dt className="text-xs text-mute">Planted</dt>
          <dd>{f.shortDate(batch.plantedAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-mute">{row.harvested ? 'Harvested' : 'Harvest est.'}</dt>
          <dd>
            {f.shortDate(batch.harvestedAt ?? batch.harvestEta)}
            {!row.harvested && <span className={`block text-xs ${eta.className}`}>{eta.text}</span>}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-mute">{row.harvested ? 'Actual' : 'Expected'}</dt>
          <dd>{yieldLabel(batch)}</dd>
        </div>
      </dl>
    </Card>
  )
}
