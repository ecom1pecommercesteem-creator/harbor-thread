import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { InfoRow } from '@/components/ui/Display'
import { Field, Input, RANGE_OPTIONS, Segmented, Select } from '@/components/ui/Form'
import { ConfirmDialog } from '@/components/ui/Overlay'
import { num } from '@/lib/format'
import { useFacility } from '@/store/hooks'
import type { Settings } from '@/types'
import { NumInput } from './NumInput'
import { Switch } from './Switch'
import type { Errors } from './settingsModel'

type SectionProps<K extends keyof Settings> = { value: Settings[K]; onChange: (v: Settings[K]) => void }

export function SectionCard({ id, title, subtitle, children }: { id: string; title: string; subtitle?: string; children: ReactNode }) {
  return (
    <Card id={id} className="scroll-mt-6">
      <CardHeader title={title} subtitle={subtitle} />
      <div className="space-y-4 px-5 pb-5 pt-4">{children}</div>
    </Card>
  )
}

/* 1. Facility details */
export function FacilitySection({ value, onChange, errors }: SectionProps<'facility'> & { errors: Errors }) {
  const fac = useFacility()
  const text = (key: keyof Settings['facility'], label: string, type: string, autoComplete: string) => {
    const k = `facility.${key}`
    return (
      <Field label={label} error={errors[k]}>
        {(id, describedBy) => (
          <Input id={id} data-field={k} type={type} autoComplete={autoComplete} aria-describedby={describedBy} aria-invalid={!!errors[k]} value={value[key]} onChange={(e) => onChange({ ...value, [key]: e.target.value })} />
        )}
      </Field>
    )
  }
  return (
    <SectionCard id="facility" title="Facility details" subtitle="Name, location and contact are informational. Facility ID and area are read-only.">
      <div className="grid gap-4 sm:grid-cols-2">
        {text('name', 'Facility name', 'text', 'organization')}
        {text('city', 'City / location', 'text', 'address-level2')}
        {text('contact', 'Contact email', 'email', 'email')}
      </div>
      <dl className="rounded-xl border border-line px-4">
        <InfoRow label="Facility ID">{fac.id}</InfoRow>
        <InfoRow label="Grow area">{num(fac.areaM2)} m²</InfoRow>
        <InfoRow label="Time zone">{fac.timezone}</InfoRow>
      </dl>
    </SectionCard>
  )
}

/* 2. Units & display */
const TEMP_OPTS = [{ value: 'C', label: '°C' }, { value: 'F', label: '°F' }] as const
const VOL_OPTS = [{ value: 'L', label: 'Litres' }, { value: 'gal', label: 'Gallons' }] as const
const CLOCK_OPTS = [{ value: '24h', label: '24 h' }, { value: '12h', label: '12 h' }] as const

export function UnitsSection({ value, onChange }: SectionProps<'units'>) {
  const c = 21.5
  const h = 14
  const temp = value.temperature === 'C' ? `${c} °C` : `${c} °C → ${(c * 1.8 + 32).toFixed(1)} °F`
  const vol = value.volume === 'L' ? '1,000 L' : `1,000 L → ${(1000 * 0.264172).toFixed(0)} gal`
  const clock = value.clock === '24h' ? '14:30' : `14:30 → ${h % 12 || 12}:30 ${h < 12 ? 'am' : 'pm'}`
  return (
    <SectionCard id="units" title="Units & display" subtitle="Applies to every temperature, volume and time shown in the dashboard. Stored values are unchanged.">
      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <span className="mb-1.5 block text-[13px] text-mute">Temperature</span>
          <Segmented label="Temperature unit" value={value.temperature} onChange={(v) => onChange({ ...value, temperature: v })} options={TEMP_OPTS} />
        </div>
        <div>
          <span className="mb-1.5 block text-[13px] text-mute">Volume</span>
          <Segmented label="Volume unit" value={value.volume} onChange={(v) => onChange({ ...value, volume: v })} options={VOL_OPTS} />
        </div>
        <div>
          <span className="mb-1.5 block text-[13px] text-mute">Clock</span>
          <Segmented label="Clock format" value={value.clock} onChange={(v) => onChange({ ...value, clock: v })} options={CLOCK_OPTS} />
        </div>
      </div>
      <p aria-live="polite" className="rounded-xl bg-card-2 px-4 py-3 text-sm text-mute">Example: {[temp, vol, clock].join('; ')}</p>
    </SectionCard>
  )
}

/* 4. Alert thresholds */
export function ThresholdsSection({ value, onChange, errors, preview }: SectionProps<'thresholds'> & { errors: Errors; preview: { warning: number; critical: number } }) {
  const num1 = (key: keyof Settings['thresholds'], label: string, hint: string) => {
    const k = `thresholds.${key}`
    return (
      <Field label={label} hint={hint} error={errors[k]}>
        {(id, describedBy) => <NumInput id={id} describedBy={describedBy} field={k} value={value[key]} invalid={!!errors[k]} onValue={(n) => onChange({ ...value, [key]: n })} />}
      </Field>
    )
  }
  return (
    <SectionCard id="thresholds" title="Alert thresholds" subtitle="Changing these immediately changes which alerts the simulation raises, and what the bell and toasts show.">
      <div className="grid gap-4 sm:grid-cols-2">
        {num1('criticalMarginPct', 'Critical escalation margin (%)', 'Escalate a warning to critical when a reading is outside its target range by more than this % of the range width. 0–200.')}
        {num1('maintenanceWarnDays', 'Maintenance warning window (days)', 'Warn when scheduled service is due within this many days. Overdue service always warns. 0–90.')}
        {num1('reservoirLowPct', 'Reservoir low-level warning (%)', 'Warn when a reservoir level falls below this. 5–90.')}
        {num1('reservoirCriticalPct', 'Reservoir critical level (%)', 'Escalate to critical below this level. 1–89, must be lower than the low-level warning.')}
      </div>
      <div className="rounded-xl bg-card-2 px-4 py-3 text-sm" aria-live="polite">
        <p className="text-ink">Preview with these draft thresholds</p>
        <p className="mt-1 text-mute">
          <span className="text-warn">{preview.warning} zone{preview.warning === 1 ? '' : 's'} warning</span>
          {' · '}
          <span className="text-crit">{preview.critical} zone{preview.critical === 1 ? '' : 's'} critical</span>
          {' '}(counts use the draft target ranges too; not saved yet)
        </p>
      </div>
    </SectionCard>
  )
}

/* 5. Notification preferences */
export function NotificationsSection({ value, onChange }: SectionProps<'notifications'>) {
  return (
    <SectionCard id="notifications" title="Notification preferences" subtitle="Controls which alert severities appear in the bell and as toasts.">
      <div className="divide-y divide-line/60">
        <Switch label="Critical alerts" description="Equipment faults and severe out-of-range readings or reservoir levels." checked={value.critical} onChange={(v) => onChange({ ...value, critical: v })} />
        <Switch label="Warning alerts" description="Moderate out-of-range readings, degraded equipment and stale sensors." checked={value.warning} onChange={(v) => onChange({ ...value, warning: v })} />
        <Switch label="Informational alerts" description="Maintenance reminders and batches ready to harvest." checked={value.info} onChange={(v) => onChange({ ...value, info: v })} />
        <Switch label="Toast on new alert" description="Briefly show a notification when new alerts are raised." checked={value.toastOnNewAlert} onChange={(v) => onChange({ ...value, toastOnNewAlert: v })} />
      </div>
    </SectionCard>
  )
}

/* 6. Dashboard display preferences */
const INTERVALS = [2, 5, 10, 30] as const

export function DisplaySection({ value, onChange }: SectionProps<'display'>) {
  return (
    <SectionCard id="dashboard" title="Dashboard display" subtitle="Layout and refresh preferences for the overview and trend cards.">
      <div className="divide-y divide-line/60">
        <Switch label="Show simulation banner" description="Show the banner that marks data as simulated." checked={value.showSimBanner} onChange={(v) => onChange({ ...value, showSimBanner: v })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <span className="mb-1.5 block text-[13px] text-mute">Default time range</span>
          <Segmented label="Default time range" value={value.defaultRange} onChange={(v) => onChange({ ...value, defaultRange: v })} options={RANGE_OPTIONS} />
        </div>
        <Field label="Simulation update interval" hint="How often the simulated sensors refresh. Pause or resume the simulation from the top bar.">
          {(id, describedBy) => (
            <Select id={id} aria-describedby={describedBy} value={String(value.simIntervalSec)} onChange={(e) => onChange({ ...value, simIntervalSec: Number(e.target.value) })}>
              {INTERVALS.map((s) => <option key={s} value={s}>{s} seconds</option>)}
            </Select>
          )}
        </Field>
      </div>
    </SectionCard>
  )
}

/* 7. Data & privacy */
export function PrivacySection() {
  const [confirm, setConfirm] = useState(false)
  return (
    <SectionCard id="privacy" title="Data & privacy" subtitle="Everything in VerdantOS is simulated.">
      <p className="text-sm text-mute">
        Sensor readings, alerts, batches and maintenance logs are simulated. Your settings and any records you add are stored only in this browser&apos;s local storage. Nothing is sent to a server.
      </p>
      <div className="flex justify-end">
        <Button variant="danger" onClick={() => setConfirm(true)}>Reset demo data</Button>
      </div>
      <ConfirmDialog
        open={confirm}
        title="Reset demo data?"
        message="This clears everything saved in this browser (settings, alert history, batches and maintenance logs you added) and reloads the demo."
        confirmLabel="Reset demo data"
        danger
        onConfirm={() => {
          localStorage.removeItem('verdantos-v1')
          location.reload()
        }}
        onCancel={() => setConfirm(false)}
      />
    </SectionCard>
  )
}
