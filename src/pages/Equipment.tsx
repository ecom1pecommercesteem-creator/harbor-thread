import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { EmptyState, PageHeader } from '@/components/ui/Display'
import { FilterSelect, SearchInput } from '@/components/ui/Form'
import { Pagination, usePagination } from '@/components/ui/Pagination'
import { EquipmentDrawer } from '@/components/domain/equipment/EquipmentDrawer'
import { EquipmentSummary } from '@/components/domain/equipment/EquipmentSummary'
import { EquipmentTable } from '@/components/domain/equipment/EquipmentTable'
import { DAY, DUE_WINDOW_DAYS, STATUS_LABEL, STATUS_ORDER, TYPE_META, TYPE_ORDER, locationOf, sortEquipment, type SortKey, type SortState } from '@/components/domain/equipment/model'
import { useFacilityEquipment } from '@/store/hooks'
import type { HealthStatus } from '@/types'

const TYPE_OPTIONS = [{ value: 'all', label: 'All types' }, ...TYPE_ORDER.map((t) => ({ value: t, label: TYPE_META[t].label }))]
const STATUS_OPTIONS = [{ value: 'all', label: 'All statuses' }, ...STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABEL[s] }))]

export default function Page() {
  const equipment = useFacilityEquipment()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [type, setType] = useState('all')
  const [status, setStatus] = useState('all')
  const [loc, setLoc] = useState('all')
  const [dueOnly, setDueOnly] = useState(false)
  const [sort, setSort] = useState<SortState>({ key: 'name', dir: 'asc' })
  const now = useMemo(() => Date.now(), [equipment])

  const locOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const e of equipment) {
      const l = locationOf(e)
      seen.set(l.key, l.label)
    }
    return [{ value: 'all', label: 'All locations' }, ...[...seen].sort((a, b) => a[1].localeCompare(b[1])).map(([value, label]) => ({ value, label }))]
  }, [equipment])

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const cutoff = now + DUE_WINDOW_DAYS * DAY
    const filtered = equipment.filter(
      (e) =>
        (type === 'all' || e.type === type) &&
        (status === 'all' || e.status === status) &&
        (loc === 'all' || locationOf(e).key === loc) &&
        (!dueOnly || Date.parse(e.maintenanceDue) <= cutoff) &&
        (!needle || [e.name, e.id, e.model, locationOf(e).label].some((s) => s.toLowerCase().includes(needle))),
    )
    return sortEquipment(filtered, sort)
  }, [equipment, q, type, status, loc, dueOnly, sort, now])

  const { pageItems, pagerProps } = usePagination(rows, JSON.stringify([q, type, status, loc, dueOnly, sort]), 10)

  const eqId = params.get('eq')
  const selected = eqId ? equipment.find((e) => e.id === eqId) : undefined

  const openEq = (id: string) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('eq', id)
      return next
    })
  const closeEq = () =>
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('eq')
      return next
    })

  const toggleStatus = (s: HealthStatus) => setStatus((prev) => (prev === s ? 'all' : s))
  const onSort = (key: SortKey) => setSort((prev) => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }))
  const filtersActive = q !== '' || type !== 'all' || status !== 'all' || loc !== 'all' || dueOnly
  const clearFilters = () => {
    setQ('')
    setType('all')
    setStatus('all')
    setLoc('all')
    setDueOnly(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Equipment" description="Inventory and health of pumps, lights, HVAC, sensors and gateways for the selected facility." />

      <EquipmentSummary equipment={equipment} activeStatus={status} onStatus={toggleStatus} />

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput className="min-w-[220px] flex-1" value={q} onChange={setQ} label="Search equipment" placeholder="Search name, ID, model, zone…" />
        <FilterSelect label="Filter by type" value={type} onChange={setType} options={TYPE_OPTIONS} />
        <FilterSelect label="Filter by status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
        <FilterSelect label="Filter by location" value={loc} onChange={setLoc} options={locOptions} />
        <button
          type="button"
          aria-pressed={dueOnly}
          onClick={() => setDueOnly((v) => !v)}
          className={`rounded-full border px-4 py-2 text-[13px] transition-colors ${dueOnly ? 'border-lime bg-lime/10 text-ink' : 'border-line bg-card text-mute hover:border-dim hover:text-ink'}`}
        >
          Due within {DUE_WINDOW_DAYS} days / overdue
        </button>
      </div>

      {equipment.length === 0 ? (
        <EmptyState title="No equipment in this facility" message="Switch facility to see its equipment." />
      ) : rows.length === 0 ? (
        <EmptyState title="No equipment matches these filters" message="Try a different search or clear the filters." action={filtersActive && <Button variant="secondary" onClick={clearFilters}>Clear filters</Button>} />
      ) : (
        <>
          <p className="text-xs text-mute" aria-live="polite">Showing {rows.length} of {equipment.length}</p>
          <EquipmentTable rows={pageItems} now={now} sort={sort} onSort={onSort} onOpen={openEq} />
          <Pagination {...pagerProps} />
        </>
      )}

      {selected && <EquipmentDrawer key={selected.id} equipment={selected} onClose={closeEq} />}
    </div>
  )
}
