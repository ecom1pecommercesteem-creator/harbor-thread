import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AddBatchModal } from '@/components/domain/crops/AddBatchModal'
import { BatchCards } from '@/components/domain/crops/BatchCards'
import { BatchDrawer } from '@/components/domain/crops/BatchDrawer'
import { BatchSummary } from '@/components/domain/crops/BatchSummary'
import { BatchTable } from '@/components/domain/crops/BatchTable'
import { BatchToolbar, type View } from '@/components/domain/crops/BatchToolbar'
import { DEFAULT_FILTERS, DEFAULT_SORT, applyFilters, buildRow, type Filters, type Sort, type SortKey } from '@/components/domain/crops/batchView'
import { Button } from '@/components/ui/Button'
import { EmptyState, PageHeader } from '@/components/ui/Display'
import { Pagination, usePagination } from '@/components/ui/Pagination'
import { useFacilityBatches, useZoneHealthMap, useZones } from '@/store/hooks'

export default function Crops() {
  const batches = useFacilityBatches()
  const zones = useZones()
  const health = useZoneHealthMap()
  const [params, setParams] = useSearchParams()
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [sort, setSort] = useState<Sort>(DEFAULT_SORT)
  const [view, setView] = useState<View>('cards')
  const [adding, setAdding] = useState(false)

  // Captured once on mount; ages and ETAs are computed against it.
  const [now] = useState(() => new Date())
  const rows = useMemo(() => batches.map((b) => buildRow(b, health, now)), [batches, health, now])
  const visible = useMemo(() => applyFilters(rows, filters, sort), [rows, filters, sort])
  const { pageItems, pagerProps } = usePagination(visible, JSON.stringify([filters, sort, view]), view === 'cards' ? 12 : 10)
  const activeZones = useMemo(() => zones.filter((z) => z.cropProfileId !== null), [zones])

  const selectedId = params.get('batch')
  const selected = selectedId ? rows.find((r) => r.batch.id === selectedId) : undefined

  const openBatch = (id: string) =>
    setParams((p) => {
      const next = new URLSearchParams(p)
      next.set('batch', id)
      return next
    })
  const closeBatch = () =>
    setParams((p) => {
      const next = new URLSearchParams(p)
      next.delete('batch')
      return next
    })

  const sortBy = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))
  const clearFilters = () => setFilters(DEFAULT_FILTERS)
  const onCreated = (id: string) => {
    // Reset filters so the new batch is guaranteed to be visible in the list.
    setFilters(DEFAULT_FILTERS)
    openBatch(id)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Crops & Batches"
        description="Production batches for the selected facility: growth stage, harvest estimates and yield. Crop targets are illustrative demonstration values."
      />

      <BatchSummary rows={rows} />

      <BatchToolbar
        filters={filters}
        onFilters={(patch) => setFilters((f) => ({ ...f, ...patch }))}
        sort={sort}
        onSort={setSort}
        view={view}
        onView={setView}
        zones={activeZones}
        onAdd={() => setAdding(true)}
      />

      {rows.length === 0 ? (
        <EmptyState
          title="No batches in this facility"
          message="Add a batch to start tracking a crop in an active zone."
          action={<Button variant="primary" onClick={() => setAdding(true)}>Add batch</Button>}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          title="No batches match these filters"
          message="Try a different status, crop or zone, or clear the filters."
          action={<Button variant="secondary" onClick={clearFilters}>Clear filters</Button>}
        />
      ) : view === 'cards' ? (
        <BatchCards rows={pageItems} onOpen={openBatch} />
      ) : (
        <BatchTable rows={pageItems} sort={sort} onSortKey={sortBy} onOpen={openBatch} />
      )}

      <Pagination {...pagerProps} />

      {selected && <BatchDrawer row={selected} health={health[selected.zone.id]} onClose={closeBatch} />}

      <AddBatchModal open={adding} onClose={() => setAdding(false)} defaultZoneId={filters.zone} onCreated={onCreated} />
    </div>
  )
}
