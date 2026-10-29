import { CircleCheck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertCard } from '@/components/domain/alerts/AlertCard'
import { AlertDetailDrawer } from '@/components/domain/alerts/AlertDetailDrawer'
import { AlertTabs } from '@/components/domain/alerts/AlertTabs'
import {
  KIND_OPTIONS,
  SORT_OPTIONS,
  STATUS_OPTIONS,
  TABS,
  matchesQuery,
  matchesTab,
  sortAlerts,
  type KindFilter,
  type SortKey,
  type StatusFilter,
  type TabId,
} from '@/components/domain/alerts/alertModel'
import { Button } from '@/components/ui/Button'
import { EmptyState, PageHeader } from '@/components/ui/Display'
import { FilterSelect, SearchInput } from '@/components/ui/Form'
import { Pagination, usePagination } from '@/components/ui/Pagination'
import { ConfirmDialog } from '@/components/ui/Overlay'
import { Card } from '@/components/ui/Card'
import { useFarm } from '@/store'
import { useFacility, useFacilityAlerts, useUnreadCount } from '@/store/hooks'
import type { Alert } from '@/types'

const isTabId = (v: string | null): v is TabId => TABS.some((t) => t.id === v)
/** Narrow a select's string value to one of its declared options. */
const pick = <T extends string>(opts: readonly { value: T }[], v: string, fallback: T): T => opts.find((o) => o.value === v)?.value ?? fallback

export default function Alerts() {
  const [params, setParams] = useSearchParams()
  const facility = useFacility()
  const alerts = useFacilityAlerts()
  const unread = useUnreadCount()

  const tabParam = params.get('tab')
  const tab: TabId = isTabId(tabParam) ? tabParam : 'all'
  const selectedId = params.get('alert')

  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<KindFilter>('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [sort, setSort] = useState<SortKey>('newest')
  const [confirmAckAll, setConfirmAckAll] = useState(false)
  const [resolveId, setResolveId] = useState<string | null>(null)

  const counts = useMemo(
    () => Object.fromEntries(TABS.map((t) => [t.id, alerts.filter((a) => matchesTab(a, t.id)).length])) as Record<TabId, number>,
    [alerts],
  )
  const activeCount = useMemo(() => alerts.filter((a) => a.status === 'active').length, [alerts])
  const filtersActive = tab !== 'all' || query.trim() !== '' || kind !== 'all' || status !== 'all'

  const visible = useMemo(
    () =>
      sortAlerts(
        alerts.filter((a) => matchesTab(a, tab) && matchesQuery(a, query) && (kind === 'all' || a.assetKind === kind) && (status === 'all' || a.status === status)),
        sort,
      ),
    [alerts, tab, query, kind, status, sort],
  )

  const { pageItems, pagerProps } = usePagination(visible, JSON.stringify([tab, query, kind, status, sort]), 12)

  const selected = alerts.find((a) => a.id === selectedId)
  const openId = selected?.id
  // Opening the drawer (by click or deep link) marks the alert read once per id.
  useEffect(() => {
    if (openId) useFarm.getState().markRead(openId)
  }, [openId])

  const resolving = alerts.find((a) => a.id === resolveId)

  /** Critical alerts need explicit confirmation before they are resolved. */
  const requestResolve = (a: Alert) => {
    if (a.severity === 'critical') setResolveId(a.id)
    else useFarm.getState().resolve(a.id)
  }

  const setParam = (mutate: (p: URLSearchParams) => void) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      mutate(next)
      return next
    })

  const selectTab = (id: TabId) => setParam((p) => (id === 'all' ? p.delete('tab') : p.set('tab', id)))
  const openAlert = (id: string) => setParam((p) => p.set('alert', id))
  const closeAlert = () => setParam((p) => p.delete('alert'))

  const clearFilters = () => {
    setQuery('')
    setKind('all')
    setStatus('all')
    setParam((p) => p.delete('tab'))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts"
        description={`${facility.name} · ${activeCount} active. Rule-generated alerts clear automatically when their condition ends.`}
        actions={
          <>
            <Button variant="ghost" size="sm" disabled={unread === 0} onClick={() => useFarm.getState().markAllRead()}>Mark all read</Button>
            <Button variant="primary" size="sm" disabled={activeCount === 0} onClick={() => setConfirmAckAll(true)}>Acknowledge all active</Button>
          </>
        }
      />

      <AlertTabs value={tab} onChange={selectTab} counts={counts} />

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={query}
          onChange={setQuery}
          label="Search alerts"
          placeholder="Search title, description, asset or rule"
          className="min-w-[220px] flex-1 sm:max-w-sm"
        />
        <FilterSelect label="Asset kind" value={kind} onChange={(v) => setKind(pick(KIND_OPTIONS, v, 'all'))} options={KIND_OPTIONS} />
        <FilterSelect label="Status" value={status} onChange={(v) => setStatus(pick(STATUS_OPTIONS, v, 'all'))} options={STATUS_OPTIONS} />
        <FilterSelect label="Sort" value={sort} onChange={(v) => setSort(pick(SORT_OPTIONS, v, 'newest'))} options={SORT_OPTIONS} />
      </div>

      <div id="alerts-panel" role="tabpanel" aria-labelledby={`alerts-tab-${tab}`} className="space-y-4">
        <p className="text-sm text-mute" aria-live="polite">Showing {visible.length} of {alerts.length} alerts</p>

        {!filtersActive && activeCount === 0 && alerts.length > 0 && (
          <div role="status" className="flex items-center gap-3 rounded-card border border-ok/30 bg-ok/10 px-5 py-4">
            <CircleCheck aria-hidden className="size-5 shrink-0 text-ok" />
            <div>
              <p className="text-base text-ink">All clear</p>
              <p className="text-sm text-mute">No active alerts for {facility.name}. Acknowledged and resolved history is listed below.</p>
            </div>
          </div>
        )}

        {visible.length === 0 ? (
          filtersActive ? (
            <EmptyState
              title="No alerts match these filters"
              message="Try another view, or clear the filters."
              action={<Button variant="secondary" size="sm" onClick={clearFilters}>Clear filters</Button>}
            />
          ) : (
            <Card>
              <EmptyState title="No alerts yet" message="Alerts appear here when a zone, reservoir or piece of equipment leaves its configured range." />
            </Card>
          )
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {pageItems.map((a) => (
              <AlertCard key={a.id} alert={a} onOpen={openAlert} onRequestResolve={requestResolve} />
            ))}
          </ul>
        )}
        <Pagination {...pagerProps} />
      </div>

      <AlertDetailDrawer alert={selected} onClose={closeAlert} onRequestResolve={requestResolve} />

      <ConfirmDialog
        open={confirmAckAll}
        title="Acknowledge all active alerts?"
        message={`This acknowledges ${activeCount} active alert${activeCount === 1 ? '' : 's'} for ${facility.name}. Alerts stay visible until they are resolved.`}
        confirmLabel="Acknowledge all"
        onConfirm={() => {
          useFarm.getState().acknowledgeAll()
          setConfirmAckAll(false)
        }}
        onCancel={() => setConfirmAckAll(false)}
      />

      <ConfirmDialog
        open={!!resolving}
        title="Resolve critical alert?"
        message={resolving ? `"${resolving.title}" is critical. Confirm that the situation has been dealt with before marking it resolved.` : ''}
        confirmLabel="Resolve"
        onConfirm={() => {
          if (resolving) useFarm.getState().resolve(resolving.id)
          setResolveId(null)
        }}
        onCancel={() => setResolveId(null)}
      />
    </div>
  )
}
