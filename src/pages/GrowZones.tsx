import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { EmptyState, PageHeader } from '@/components/ui/Display'
import { Button } from '@/components/ui/Button'
import { FilterSelect, SearchInput, Segmented } from '@/components/ui/Form'
import { Pagination, usePagination } from '@/components/ui/Pagination'
import { ZoneCard } from '@/components/domain/zones/ZoneCard'
import { ZoneDetailDrawer } from '@/components/domain/zones/ZoneDetailDrawer'
import { ZoneTable } from '@/components/domain/zones/ZoneTable'
import { HEALTH_FILTERS, IDLE_CROP, useZoneViews, type HealthFilter } from '@/components/domain/zones/zoneView'
import { useZones } from '@/store/hooks'
import { CROP_BY_ID } from '@/data/seed'

type Layout = 'grid' | 'list'
const VIEW_OPTIONS = [
  { value: 'grid', label: 'Grid' },
  { value: 'list', label: 'List' },
] as const

const isHealth = (v: string): v is HealthFilter => HEALTH_FILTERS.some((o) => o.value === v)

export default function GrowZones() {
  const views = useZoneViews()
  const zones = useZones()
  const [query, setQuery] = useState('')
  const [health, setHealth] = useState<HealthFilter>('all')
  const [crop, setCrop] = useState<string>('all')
  const [layout, setLayout] = useState<Layout>('grid')
  const [params, setParams] = useSearchParams()
  const selected = views.find((v) => v.zone.id === params.get('zone'))

  const cropOptions = useMemo(() => {
    const ids = [...new Set(zones.map((z) => z.cropProfileId).filter((id): id is string => !!id))]
    return [
      { value: 'all', label: 'All crops' },
      ...ids.map((id) => {
        const c = CROP_BY_ID.get(id)!
        return { value: id, label: `${c.name} · ${c.variety}` }
      }),
      { value: IDLE_CROP, label: 'No crop (idle)' },
    ]
  }, [zones])
  // A crop filter from another facility may no longer exist; fall back to "all" without an effect.
  const cropValue = cropOptions.some((o) => o.value === crop) ? crop : 'all'

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return views.filter(
      (v) =>
        (health === 'all' || v.health === health) &&
        (cropValue === 'all' || (cropValue === IDLE_CROP ? !v.zone.cropProfileId : v.zone.cropProfileId === cropValue)) &&
        (!q || v.searchText.includes(q)),
    )
  }, [views, health, cropValue, query])

  const { pageItems, pagerProps } = usePagination(filtered, JSON.stringify([query, health, cropValue, layout]), 8)

  const clearFilters = () => {
    setQuery('')
    setHealth('all')
    setCrop('all')
  }

  const openZone = (id: string) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('zone', id)
      return next
    })
  const closeZone = () =>
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('zone')
      return next
    })

  return (
    <div className="space-y-6">
      <PageHeader title="Grow Zones" description="Racks, crops and live conditions for every zone in the selected facility." />

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={query}
          onChange={setQuery}
          label="Search zones"
          placeholder="Search zone, crop or variety"
          className="min-w-[220px] flex-1 sm:max-w-xs"
        />
        <FilterSelect
          label="Health status"
          value={health}
          onChange={(v) => setHealth(isHealth(v) ? v : 'all')}
          options={HEALTH_FILTERS}
        />
        <FilterSelect label="Crop" value={cropValue} onChange={setCrop} options={cropOptions} />
        <div className="ml-auto">
          <Segmented size="sm" label="Layout" value={layout} onChange={setLayout} options={VIEW_OPTIONS} />
        </div>
      </div>

      {views.length === 0 ? (
        <EmptyState title="No zones in this facility" message="Switch facility to see its grow zones." />
      ) : (
        <>
          <p className="text-sm text-mute" aria-live="polite">
            Showing {filtered.length} of {views.length} zones
          </p>
          {filtered.length === 0 ? (
            <EmptyState
              title="No zones match these filters"
              message="Try a different search term, health status or crop."
              action={
                <Button variant="secondary" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : layout === 'grid' ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {pageItems.map((v) => (
                <ZoneCard key={v.zone.id} view={v} onOpen={() => openZone(v.zone.id)} />
              ))}
            </div>
          ) : (
            <ZoneTable views={pageItems} onOpen={openZone} />
          )}
          <Pagination {...pagerProps} />
        </>
      )}

      <ZoneDetailDrawer view={selected} onClose={closeZone} />
    </div>
  )
}
