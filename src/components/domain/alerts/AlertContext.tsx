import { ArrowUpRight } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { TimeSeriesChart } from '@/components/charts'
import { Badge, StatusBadge, type Tone } from '@/components/ui/Badge'
import { EmptyState, InfoRow, Reading } from '@/components/ui/Display'
import { envSeries } from '@/data/history'
import { CROP_BY_ID, RESERVOIR_BY_ID, ZONE_BY_ID } from '@/data/seed'
import { useFmt } from '@/lib/format'
import { METRIC_META } from '@/lib/metrics'
import { useFacilityEquipment } from '@/store/hooks'
import { useFarm } from '@/store'
import { effectiveTargets, zoneHealth } from '@/sim/rules'
import type { Alert, PumpState } from '@/types'
import { isMetric } from './alertModel'

function OpenLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1.5 text-sm text-lime hover:underline">
      {label}
      <ArrowUpRight aria-hidden className="size-4" />
    </Link>
  )
}

/** Context section: picks the zone / equipment / reservoir view for the alert's asset. */
export function AlertContext({ alert }: { alert: Alert }) {
  if (alert.assetKind === 'zone') return <ZoneContext alert={alert} />
  if (alert.assetKind === 'equipment') return <EquipmentContext alert={alert} />
  return <ReservoirContext alert={alert} />
}

function ZoneContext({ alert }: { alert: Alert }) {
  const fmt = useFmt()
  const live = useFarm((s) => s.live)
  const settings = useFarm((s) => s.settings)
  const histVersion = useFarm((s) => s.histVersion)
  const zone = ZONE_BY_ID.get(alert.assetId)
  const metric = isMetric(alert.metric) ? alert.metric : null

  const history = useMemo(() => (zone && metric ? envSeries([zone.id], metric, '24h', live) : []), [zone, metric, live, histVersion])

  if (!zone) return <EmptyState title="Zone not found" message="This zone is not part of the selected facility." />
  if (!zone.cropProfileId) return <EmptyState title="Idle zone" message="No crop is planted here, so there is no live data." />

  const zoneLive = live[zone.id]
  const health = zoneHealth(zone, zoneLive, settings)
  const stale = !!zoneLive && !zoneLive.sensorOnline
  const isTemp = metric === 'temperature'
  const toDisp = (v: number) => (isTemp ? fmt.tempVal(v) : v)
  const unit = isTemp ? fmt.tempUnit : metric ? METRIC_META[metric].unit : ''
  const dec = metric ? METRIC_META[metric].decimals : 1
  const target = metric ? effectiveTargets(zone.cropProfileId, settings)[metric] : null
  const series = history.map((p) => ({ t: p.t, value: toDisp(p.value) }))
  const reading = zoneLive && metric ? toDisp(zoneLive[metric]).toFixed(dec) : '—'

  return (
    <div className="space-y-4">
      <dl className="grid gap-x-6 sm:grid-cols-2">
        <InfoRow label="Zone health"><StatusBadge status={health} /></InfoRow>
        <InfoRow label="Crop">{CROP_BY_ID.get(zone.cropProfileId)?.name ?? '—'}</InfoRow>
        {metric && (
          <InfoRow label={`Current ${METRIC_META[metric].label}`}>
            <Reading value={reading} unit={unit} stale={stale} since={zoneLive ? fmt.ago(zoneLive.updatedAt) : undefined} />
          </InfoRow>
        )}
        {metric && target && <InfoRow label="Target (demo)">{`${toDisp(target.min).toFixed(dec)}–${toDisp(target.max).toFixed(dec)} ${unit}`}</InfoRow>}
      </dl>

      {metric && target ? (
        <>
          <TimeSeriesChart
            data={series}
            series={[{ key: 'value', label: METRIC_META[metric].label, unit, decimals: dec }]}
            range="24h"
            height={220}
            band={{ min: toDisp(target.min), max: toDisp(target.max) }}
            label={`Last 24 hours of ${METRIC_META[metric].label} in Zone ${zone.code}`}
          />
          <p className="text-xs text-dim">Last 24 h. Target bands are illustrative demo values, not validated growing recipes.</p>
        </>
      ) : (
        <p className="text-sm text-mute">This alert concerns sensor or maintenance status, so there is no climate trend to show.</p>
      )}

      <OpenLink to={`/environment?zone=${zone.id}`} label={`Open Environment for Zone ${zone.code}`} />
    </div>
  )
}

function EquipmentContext({ alert }: { alert: Alert }) {
  const fmt = useFmt()
  const eq = useFacilityEquipment().find((e) => e.id === alert.assetId)
  if (!eq) return <EmptyState title="Equipment not found" message="This equipment is not part of the selected facility." />

  return (
    <div className="space-y-4">
      <dl className="grid gap-x-6 sm:grid-cols-2">
        <InfoRow label="Status"><StatusBadge status={eq.status} /></InfoRow>
        <InfoRow label="Model">{eq.model}</InfoRow>
        <InfoRow label="Maintenance due">{fmt.date(eq.maintenanceDue)}</InfoRow>
        <InfoRow label="Last seen">{fmt.ago(eq.lastSeen)}</InfoRow>
      </dl>

      <div>
        <h4 className="mb-2 text-sm text-mute">Faults</h4>
        {eq.faults.length ? (
          <ul className="space-y-2">
            {eq.faults.slice(0, 5).map((f) => (
              <li key={f.id} className="rounded-xl bg-card-2 px-3.5 py-2.5 text-sm">
                <span className="font-mono text-xs text-warn">{f.code}</span> <span className="text-ink">{f.message}</span>
                <div className="mt-0.5 text-xs text-dim">{fmt.dateTime(f.at)}</div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-mute">No faults recorded.</p>
        )}
      </div>

      <OpenLink to={`/equipment?eq=${eq.id}`} label={`Open ${eq.name}`} />
    </div>
  )
}

const PUMP_TONE: Record<PumpState, Tone> = { running: 'ok', idle: 'neutral', fault: 'crit' }

function ReservoirContext({ alert }: { alert: Alert }) {
  const fmt = useFmt()
  const res = RESERVOIR_BY_ID.get(alert.assetId)
  const rl = useFarm((s) => s.resLive[alert.assetId])
  const low = useFarm((s) => s.settings.thresholds.reservoirLowPct)
  if (!res) return <EmptyState title="Reservoir not found" message="This reservoir is not part of the selected facility." />
  if (!rl) return <EmptyState title="No live data" message="This reservoir has no simulated readings yet." />

  return (
    <div className="space-y-4">
      <dl className="grid gap-x-6 sm:grid-cols-2">
        <InfoRow label="Water level"><Reading value={rl.levelPct.toFixed(0)} unit="%" /></InfoRow>
        <InfoRow label="Low-level line">{`${low} %`}</InfoRow>
        <InfoRow label="pH">{rl.ph.toFixed(METRIC_META.ph.decimals)}</InfoRow>
        <InfoRow label="EC">{`${rl.ec.toFixed(METRIC_META.ec.decimals)} ${METRIC_META.ec.unit}`}</InfoRow>
        <InfoRow label="Water temperature">{fmt.temp(rl.waterTemp)}</InfoRow>
        <InfoRow label="Pump"><Badge tone={PUMP_TONE[rl.pump]} dot className="capitalize">{rl.pump}</Badge></InfoRow>
      </dl>
      <OpenLink to={`/water?res=${res.id}`} label={`Open ${res.name}`} />
    </div>
  )
}
