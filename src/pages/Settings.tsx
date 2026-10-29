import { useEffect, useMemo, useState } from 'react'
import { DisplaySection, FacilitySection, NotificationsSection, PrivacySection, ThresholdsSection, UnitsSection } from '@/components/domain/settings/FormSections'
import { AppearanceSection } from '@/components/domain/settings/AppearanceSection'
import { TargetsSection } from '@/components/domain/settings/TargetsEditor'
import { deepEqual, validateSettings, type Errors } from '@/components/domain/settings/settingsModel'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/Display'
import { ConfirmDialog } from '@/components/ui/Overlay'
import { DEFAULT_SETTINGS } from '@/data/defaults'
import { cx } from '@/lib/format'
import { useFarm } from '@/store'
import { useZones } from '@/store/hooks'
import { zoneBreaches } from '@/sim/rules'
import type { Settings } from '@/types'

const SECTIONS = [
  { id: 'facility', label: 'Facility details' },
  { id: 'units', label: 'Units & display' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'targets', label: 'Target ranges' },
  { id: 'thresholds', label: 'Alert thresholds' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'privacy', label: 'Data & privacy' },
]

export default function SettingsPage() {
  const saved = useFarm((s) => s.settings)
  const live = useFarm((s) => s.live)
  const zones = useZones()
  const [draft, setDraft] = useState<Settings>(saved)
  const [attempted, setAttempted] = useState(false)
  // Bumped on discard/reset so uncontrolled number inputs remount with the new values.
  const [rev, setRev] = useState(0)
  const [openCrops, setOpenCrops] = useState<string[]>([])
  const [active, setActive] = useState(SECTIONS[0].id)
  const [confirmReset, setConfirmReset] = useState(false)

  const errors = useMemo(() => validateSettings(draft), [draft])
  const shown: Errors = attempted ? errors : {}
  const dirty = useMemo(() => !deepEqual(draft, saved), [draft, saved])

  // Live breach counts under the DRAFT thresholds and targets, so the effect is visible before saving.
  const preview = useMemo(() => {
    const ctx: Settings = { ...saved, thresholds: draft.thresholds, targets: draft.targets }
    let warning = 0
    let critical = 0
    for (const z of zones) {
      const b = zoneBreaches(z, live[z.id], ctx)
      if (b.some((x) => x.severity === 'critical')) critical++
      else if (b.length) warning++
    }
    return { warning, critical }
  }, [zones, live, saved, draft.thresholds, draft.targets])

  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id)
      },
      { rootMargin: '-15% 0px -75% 0px' },
    )
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id)
      if (el) io.observe(el)
    }
    return () => io.disconnect()
  }, [rev])

  const setSection = <K extends keyof Settings>(key: K, value: Settings[K]) => setDraft((d) => ({ ...d, [key]: value }))

  const save = () => {
    const first = Object.keys(errors)[0]
    if (first) {
      setAttempted(true)
      const cropIds = Object.keys(errors).filter((k) => k.startsWith('targets.')).map((k) => k.split('.')[1])
      setOpenCrops((o) => [...new Set([...o, ...cropIds])])
      useFarm.getState().toast('error', 'Fix the highlighted fields to save.')
      // Wait for any newly opened accordion panel to render before moving focus.
      setTimeout(() => {
        const el = document.querySelector<HTMLElement>(`[data-field="${first}"]`)
        el?.scrollIntoView({ block: 'center' })
        el?.focus({ preventScroll: true })
      }, 0)
      return
    }
    useFarm.getState().setSettings(draft)
    setAttempted(false)
  }

  const discard = () => {
    setDraft(saved)
    setAttempted(false)
    setRev((r) => r + 1)
  }

  const resetAll = () => {
    useFarm.getState().resetSettings()
    setDraft(DEFAULT_SETTINGS)
    setAttempted(false)
    setConfirmReset(false)
    setRev((r) => r + 1)
  }

  const toggleCrop = (id: string) => setOpenCrops((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Preferences are saved in this browser and apply across the dashboard as soon as you save."
        actions={<Button variant="secondary" onClick={() => setConfirmReset(true)}>Reset to defaults</Button>}
      />

      <div className="lg:grid lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-8">
        <nav aria-label="Settings sections" className="sticky top-6 hidden self-start lg:block">
          <ul className="space-y-1 text-sm">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  aria-current={active === s.id ? 'true' : undefined}
                  onClick={() => setActive(s.id)}
                  className={cx('block rounded-full px-3.5 py-1.5 transition-colors', active === s.id ? 'bg-chip text-ink' : 'text-mute hover:text-ink')}
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-6">
          <div key={rev} className="space-y-6">
            <FacilitySection value={draft.facility} onChange={(v) => setSection('facility', v)} errors={shown} />
            <UnitsSection value={draft.units} onChange={(v) => setSection('units', v)} />
            <AppearanceSection />
            <TargetsSection targets={draft.targets} onChange={(v) => setSection('targets', v)} errors={shown} open={openCrops} onToggle={toggleCrop} />
            <ThresholdsSection value={draft.thresholds} onChange={(v) => setSection('thresholds', v)} errors={shown} preview={preview} />
            <NotificationsSection value={draft.notifications} onChange={(v) => setSection('notifications', v)} />
            <DisplaySection value={draft.display} onChange={(v) => setSection('display', v)} />
            <PrivacySection />
          </div>

          {dirty && (
            <div role="region" aria-label="Unsaved changes" className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-card-2 px-5 py-3 shadow-2xl">
              <p className="text-sm">
                <span className="text-warn">Unsaved changes</span>
                {attempted && Object.keys(errors).length > 0 && <span className="ml-2 text-crit">Fix the highlighted fields to save.</span>}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" onClick={discard}>Discard</Button>
                <Button variant="primary" onClick={save}>Save changes</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Reset settings to defaults?"
        message="Facility details, units, target ranges, alert thresholds and display preferences return to the demo defaults. Batches, alert history and maintenance logs are not affected."
        confirmLabel="Reset settings"
        danger
        onConfirm={resetAll}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  )
}
