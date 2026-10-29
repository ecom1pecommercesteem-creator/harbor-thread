import { useMemo } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AlertStatusBadge, SeverityBadge, StatusBadge } from '@/components/ui/Badge'
import { EmptyState, Section } from '@/components/ui/Display'
import { Drawer } from '@/components/ui/Overlay'
import { CropBanner } from '@/components/ui/Photo'
import { useFmt } from '@/lib/format'
import { useFacilityAlerts } from '@/store/hooks'
import { StaleNotice } from './ZonePrimitives'
import { ZoneCharts } from './ZoneCharts'
import { ZoneConditions } from './ZoneConditions'
import { ZoneCropBatches } from './ZoneCropBatches'
import type { ZoneView } from './zoneView'

function ZoneAlerts({ zoneId }: { zoneId: string }) {
  const fmt = useFmt()
  const alerts = useFacilityAlerts()
  const list = useMemo(
    () =>
      alerts
        .filter((a) => a.assetKind === 'zone' && a.assetId === zoneId)
        .sort((a, b) => Number(a.status === 'resolved') - Number(b.status === 'resolved') || Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [alerts, zoneId],
  )
  return (
    <Section title="Alerts">
      {list.length === 0 ? (
        <EmptyState title="No alerts for this zone" message="Breaches and sensor faults appear here when they occur." />
      ) : (
        <ul className="space-y-2">
          {list.map((a) => (
            <li key={a.id}>
              <Link
                to={`/alerts?alert=${encodeURIComponent(a.id)}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-card-2 p-4 transition-colors hover:border-dim"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={a.severity} />
                    <AlertStatusBadge status={a.status} />
                  </div>
                  <p className="mt-2 text-sm text-ink">{a.title}</p>
                </div>
                <span className="whitespace-nowrap text-xs text-mute">{fmt.ago(a.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

const CHIP =
  'inline-flex h-8 items-center gap-1.5 rounded-full bg-chip px-3.5 text-[13px] text-ink transition-colors hover:bg-dim/30'

function ZoneLinks({ code }: { code: string }) {
  return (
    <Section title="Related">
      <div className="flex flex-wrap gap-2">
        <Link to="/environment" className={CHIP}>Environment <ArrowUpRight aria-hidden className="size-3.5" /></Link>
        <Link to={`/equipment?eq=${encodeURIComponent(`EQ-LED-${code}`)}`} className={CHIP}>LED array {code} <ArrowUpRight aria-hidden className="size-3.5" /></Link>
        <Link to={`/equipment?eq=${encodeURIComponent(`EQ-SNS-${code}`)}`} className={CHIP}>Sensor node {code} <ArrowUpRight aria-hidden className="size-3.5" /></Link>
      </div>
    </Section>
  )
}

function ZoneDetailBody({ view }: { view: ZoneView }) {
  return (
    <div className="space-y-2">
      {view.crop && <CropBanner category={view.crop.category} />}
      {view.stale && <StaleNotice view={view} className="mb-6" />}
      <ZoneConditions view={view} />
      <ZoneCharts view={view} />
      <ZoneCropBatches view={view} />
      <ZoneAlerts zoneId={view.zone.id} />
      <ZoneLinks code={view.zone.code} />
    </div>
  )
}

/** Zone detail drawer. `view` is undefined when closed or when the id is not in the selected facility. */
export function ZoneDetailDrawer({ view, onClose }: { view: ZoneView | undefined; onClose: () => void }) {
  return (
    <Drawer
      open={!!view}
      onClose={onClose}
      wide
      title={view ? `Zone ${view.zone.code} · ${view.zone.name}` : 'Zone'}
      subtitle={
        view && (
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={view.health} />
            <span>{view.crop ? `${view.crop.name} · ${view.crop.variety}` : 'Idle — no crop'}</span>
          </span>
        )
      }
    >
      {view && <ZoneDetailBody view={view} />}
    </Drawer>
  )
}
