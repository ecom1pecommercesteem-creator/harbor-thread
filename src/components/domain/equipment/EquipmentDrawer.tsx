import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, SeverityBadge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { InfoRow, Section } from '@/components/ui/Display'
import { ConfirmDialog, Drawer } from '@/components/ui/Overlay'
import { cx, useFmt } from '@/lib/format'
import { RESERVOIR_BY_ID, ZONE_BY_ID, statusHistory } from '@/data/seed'
import { useFarm, type MaintenanceInput } from '@/store'
import { useFacilityAlerts } from '@/store/hooks'
import type { Equipment, HealthStatus } from '@/types'
import { STATUS_LABEL, TYPE_META, dueInfo, locationOf, recentFaults } from './model'
import { MaintenanceForm } from './MaintenanceForm'

const DOT: Record<HealthStatus, string> = { operational: 'bg-ok', warning: 'bg-warn', critical: 'bg-crit', offline: 'bg-dim' }

export function EquipmentDrawer({ equipment: eq, onClose }: { equipment: Equipment; onClose: () => void }) {
  const f = useFmt()
  const facilityAlerts = useFacilityAlerts()
  const allLogs = useFarm((s) => s.maintenanceLogs)
  const [logging, setLogging] = useState(false)
  const [pending, setPending] = useState<MaintenanceInput | null>(null)
  const now = useMemo(() => Date.now(), [eq])

  const loc = locationOf(eq)
  const due = dueInfo(eq.maintenanceDue, now)
  const faults = recentFaults(eq, now)
  const history = useMemo(() => statusHistory(eq), [eq])
  const openAlerts = useMemo(() => facilityAlerts.filter((a) => a.assetKind === 'equipment' && a.assetId === eq.id && a.status !== 'resolved'), [facilityAlerts, eq.id])
  const logs = useMemo(() => allLogs.filter((l) => l.equipmentId === eq.id), [allLogs, eq.id])
  const zone = loc.zoneId ? ZONE_BY_ID.get(loc.zoneId) : undefined
  const reservoir = loc.reservoirId ? RESERVOIR_BY_ID.get(loc.reservoirId) : undefined

  const commit = (input: MaintenanceInput) => {
    useFarm.getState().logMaintenance(input)
    setLogging(false)
  }
  const submit = (input: MaintenanceInput) => {
    const dangerous = input.status !== undefined && input.status !== eq.status && (input.status === 'offline' || input.status === 'critical')
    if (dangerous) setPending(input)
    else commit(input)
  }
  // While the confirm dialog is up, Escape must cancel only the dialog, not the drawer behind it.
  const guardedClose = () => {
    if (!pending) onClose()
  }

  return (
    <Drawer open onClose={guardedClose} title={eq.name} subtitle={<span className="font-mono text-xs">{eq.id}</span>} wide>
      <dl className="mb-6">
        <InfoRow label="Model">{eq.model}</InfoRow>
        <InfoRow label="Type">{TYPE_META[eq.type].label}</InfoRow>
        <InfoRow label="Location">{loc.label}</InfoRow>
        <InfoRow label="Status"><StatusBadge status={eq.status} /></InfoRow>
        <InfoRow label="Last seen">
          {eq.status === 'offline' ? <span className="text-warn">no heartbeat · {f.ago(eq.lastSeen)}</span> : f.ago(eq.lastSeen)}
        </InfoRow>
        <InfoRow label="Maintenance due">
          <span>{f.date(eq.maintenanceDue)} · <span className={cx(due.overdue ? 'text-crit' : due.soon ? 'text-warn' : 'text-mute')}>{due.label}</span></span>
        </InfoRow>
      </dl>

      {openAlerts.length > 0 && (
        <Section title="Open alerts">
          <ul className="space-y-2">
            {openAlerts.map((a) => (
              <li key={a.id}>
                <Link to={`/alerts?alert=${a.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-card-2 px-4 py-3 text-sm hover:border-dim">
                  <span>{a.title}</span>
                  <SeverityBadge severity={a.severity} />
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {(zone || reservoir) && (
        <Section title="Related">
          <ul className="flex flex-wrap gap-2">
            {zone && <li><Link to={`/zones?zone=${zone.id}`} className="inline-flex rounded-full bg-chip px-3 py-1.5 text-[13px] text-lime hover:underline">Zone {zone.code}</Link></li>}
            {reservoir && <li><Link to={`/water?res=${reservoir.id}`} className="inline-flex rounded-full bg-chip px-3 py-1.5 text-[13px] text-lime hover:underline">{reservoir.name.split(' · ')[0]}</Link></li>}
          </ul>
        </Section>
      )}

      <Section title="Recent faults (14 days)">
        {faults.length === 0 ? (
          <p className="text-sm text-mute">No faults in the last 14 days.</p>
        ) : (
          <ul className="space-y-2">
            {faults.map((fl) => (
              <li key={fl.id} className="rounded-xl border border-line bg-card-2 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge tone="warn">{fl.code}</Badge>
                  <time dateTime={fl.at} className="text-xs text-mute">{f.dateTime(fl.at)}</time>
                </div>
                <p className="mt-2 text-sm">{fl.message}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Simulated status history">
        <p className="mb-3 text-xs text-dim">Generated for demonstration. Not a recorded log.</p>
        <ol className="relative ml-2 border-l border-line">
          {history.map((ev, i) => (
            <li key={`${i}-${ev.at}`} className="relative pb-5 pl-6 last:pb-0">
              <span aria-hidden className={cx('absolute -left-[5px] top-1.5 size-2.5 rounded-full', DOT[ev.status])} />
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={ev.status} label={STATUS_LABEL[ev.status]} />
                <time dateTime={ev.at} className="text-xs text-mute">{f.dateTime(ev.at)}</time>
              </div>
              <p className="mt-1.5 text-sm text-mute">{ev.note}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Maintenance log">
        {logs.length === 0 ? (
          <p className="text-sm text-mute">No maintenance entries for this asset yet.</p>
        ) : (
          <ul className="divide-y divide-line/60">
            {logs.map((l) => (
              <li key={l.id} className="py-3 text-sm">
                <p>{l.note}</p>
                <p className="mt-1 text-xs text-mute">{l.author} · <time dateTime={l.at}>{f.dateTime(l.at)}</time></p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Log maintenance" action={!logging && <Button size="sm" variant="secondary" onClick={() => setLogging(true)}>Log maintenance</Button>}>
        {logging ? (
          <MaintenanceForm equipment={eq} onSubmit={submit} onCancel={() => setLogging(false)} />
        ) : (
          <p className="text-sm text-mute">Add a service note, and optionally a new status or next service date. Stored locally in this browser — demo only.</p>
        )}
      </Section>

      <ConfirmDialog
        open={!!pending}
        danger
        title={`Set ${eq.name} to ${pending?.status ? STATUS_LABEL[pending.status] : ''}?`}
        message={`This changes the status shown across the dashboard for ${eq.id}. The change is stored locally in this browser and is demo only.`}
        confirmLabel={`Set to ${pending?.status ? STATUS_LABEL[pending.status] : ''}`}
        onConfirm={() => {
          if (pending) commit(pending)
          setPending(null)
        }}
        onCancel={() => setPending(null)}
      />
    </Drawer>
  )
}
