import { ArrowDown, ArrowUp, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FilterSelect, SearchInput, Segmented } from '@/components/ui/Form'
import { CROPS } from '@/data/seed'
import type { Zone } from '@/types'
import type { Filters, Scope, Sort, SortKey, StatusFilter } from './batchView'

export type View = 'cards' | 'table'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'healthy', label: 'Healthy' },
  { value: 'attention', label: 'Needs attention' },
  { value: 'at-risk', label: 'At risk' },
  { value: 'harvested', label: 'Harvested' },
]
const SCOPE_OPTIONS = [
  { value: 'active', label: 'Active only' },
  { value: 'all', label: 'All batches' },
  { value: 'harvested', label: 'Harvested' },
]
const SORT_OPTIONS = [
  { value: 'eta', label: 'Harvest ETA' },
  { value: 'planted', label: 'Planting date' },
  { value: 'days', label: 'Days since planting' },
  { value: 'yield', label: 'Expected yield' },
  { value: 'id', label: 'Batch ID' },
]
const VIEW_OPTIONS = [
  { value: 'cards', label: 'Cards' },
  { value: 'table', label: 'Table' },
] as const

interface Props {
  filters: Filters
  onFilters: (patch: Partial<Filters>) => void
  sort: Sort
  onSort: (next: Sort) => void
  view: View
  onView: (v: View) => void
  zones: Zone[]
  onAdd: () => void
}

export function BatchToolbar({ filters, onFilters, sort, onSort, view, onView, zones, onAdd }: Props) {
  const DirIcon = sort.dir === 'asc' ? ArrowUp : ArrowDown
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SearchInput
        label="Search batches"
        placeholder="Batch, crop, variety or zone"
        value={filters.q}
        onChange={(q) => onFilters({ q })}
        className="w-full sm:w-72"
      />
      <FilterSelect label="Status" value={filters.status} onChange={(v) => onFilters({ status: v as StatusFilter })} options={STATUS_OPTIONS} />
      <FilterSelect label="Batch scope" value={filters.scope} onChange={(v) => onFilters({ scope: v as Scope })} options={SCOPE_OPTIONS} />
      <FilterSelect
        label="Crop"
        value={filters.crop}
        onChange={(crop) => onFilters({ crop })}
        options={[{ value: 'all', label: 'All crops' }, ...CROPS.map((c) => ({ value: c.id, label: c.name }))]}
      />
      <FilterSelect
        label="Zone"
        value={filters.zone}
        onChange={(zone) => onFilters({ zone })}
        options={[{ value: 'all', label: 'All zones' }, ...zones.map((z) => ({ value: z.id, label: `Zone ${z.code} · ${z.name}` }))]}
      />
      <div className="flex items-center gap-1.5">
        <FilterSelect label="Sort by" value={sort.key} onChange={(v) => onSort({ ...sort, key: v as SortKey })} options={SORT_OPTIONS} />
        <Button
          size="sm"
          variant="secondary"
          icon={<DirIcon className="size-3.5" />}
          aria-label={`Sort direction: ${sort.dir === 'asc' ? 'ascending' : 'descending'}. Activate to reverse.`}
          onClick={() => onSort({ ...sort, dir: sort.dir === 'asc' ? 'desc' : 'asc' })}
        >
          {sort.dir === 'asc' ? 'Asc' : 'Desc'}
        </Button>
      </div>
      <Segmented label="View" value={view} options={VIEW_OPTIONS} onChange={onView} size="sm" />
      <Button variant="primary" icon={<Plus className="size-4" />} onClick={onAdd} className="ml-auto">
        Add batch
      </Button>
    </div>
  )
}
