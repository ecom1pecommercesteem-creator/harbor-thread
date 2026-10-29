import { Bell, ChevronRight, Menu, Moon, Pause, Play, RotateCcw, Search, Settings as SettingsIcon, ShieldCheck, Sun } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Badge, SEVERITY_TONE } from '@/components/ui/Badge'
import { Button, IconButton } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/Overlay'
import { cx, useFmt } from '@/lib/format'
import { USER } from '@/lib/metrics'
import { navFor } from '@/lib/nav'
import { useTheme } from '@/lib/theme'
import { useFarm } from '@/store'
import { useFacility, useFacilityAlerts, useUnreadCount } from '@/store/hooks'
import { FacilityMenu } from './FacilityMenu'
import { Popover } from './Popover'

function SimControl() {
  const paused = useFarm((s) => s.simPaused)
  const setPaused = useFarm((s) => s.setSimPaused)
  return (
    <button type="button" onClick={() => setPaused(!paused)} aria-pressed={paused} aria-label={paused ? 'Resume simulation' : 'Pause simulation'} title={paused ? 'Resume simulation' : 'Pause simulation'}
      className="flex h-10 items-center gap-2 rounded-full border border-line bg-card pl-3.5 pr-4 text-[13px] hover:border-dim">
      <span aria-hidden className="relative flex size-2">
        {!paused && <span className="absolute inline-flex size-full animate-ping rounded-full bg-lime opacity-60 motion-reduce:animate-none" />}
        <span className={cx('relative inline-flex size-2 rounded-full', paused ? 'bg-warn' : 'bg-lime')} />
      </span>
      <span className="hidden sm:inline">{paused ? 'Paused' : 'Live sim'}</span>
      {paused ? <Play aria-hidden className="size-3.5 text-mute" /> : <Pause aria-hidden className="size-3.5 text-mute" />}
    </button>
  )
}

function ThemeToggle() {
  const { resolved, toggle } = useTheme()
  const next = resolved === 'dark' ? 'light' : 'dark'
  return (
    <button type="button" onClick={toggle} aria-label={`Switch to ${next} mode`} title={`Switch to ${next} mode`}
      className="flex size-10 items-center justify-center rounded-full border border-line bg-card text-mute hover:border-dim hover:text-ink">
      {resolved === 'dark' ? <Sun aria-hidden className="size-[18px]" /> : <Moon aria-hidden className="size-[18px]" />}
    </button>
  )
}

function Notifications() {
  const alerts = useFacilityAlerts()
  const unread = useUnreadCount()
  const markAllRead = useFarm((s) => s.markAllRead)
  const markRead = useFarm((s) => s.markRead)
  const navigate = useNavigate()
  const f = useFmt()
  const recent = alerts.filter((a) => a.status !== 'resolved').slice(0, 6)
  return (
    <Popover label="Notifications" className="w-[min(380px,calc(100vw-2rem))]" trigger={({ open, toggle, id }) => (
      <button type="button" onClick={toggle} aria-haspopup="dialog" aria-expanded={open} aria-controls={id} aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        className="relative flex size-10 items-center justify-center rounded-full border border-line bg-card text-mute hover:border-dim hover:text-ink">
        <Bell aria-hidden className="size-[18px]" />
        {unread > 0 && <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-crit px-1 text-[10.5px] font-semibold text-white">{unread}</span>}
      </button>
    )}>
      {(close) => (
        <div>
          <div className="flex items-center justify-between px-3 py-2.5">
            <span className="text-sm">Notifications</span>
            <Button size="sm" variant="ghost" disabled={!unread} onClick={markAllRead}>Mark all read</Button>
          </div>
          {recent.length === 0 ? <p className="px-3 py-8 text-center text-sm text-mute">No open alerts. All clear.</p> : (
            <ul data-lenis-prevent className="max-h-[380px] overflow-y-auto">
              {recent.map((a) => (
                <li key={a.id}>
                  <button type="button" onClick={() => { markRead(a.id); navigate(`/alerts?alert=${a.id}`); close() }} className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-chip">
                    <span aria-hidden className={cx('mt-1.5 size-2 shrink-0 rounded-full', a.read ? 'bg-transparent' : 'bg-lime')} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2"><Badge tone={SEVERITY_TONE[a.severity]} className="capitalize">{a.severity}</Badge><span className="text-[11px] text-mute">{f.ago(a.createdAt)}</span></span>
                      <span className="mt-1 block truncate text-[13.5px]">{a.title}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Link to="/alerts" onClick={close} className="mt-1 block rounded-xl px-3 py-2.5 text-center text-[13px] text-lime hover:bg-chip">View all alerts</Link>
        </div>
      )}
    </Popover>
  )
}

function ProfileMenu() {
  const [confirm, setConfirm] = useState(false)
  const item = 'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-chip'
  return (
    <>
      <Popover label="Profile menu" trigger={({ open, toggle, id }) => (
        <button type="button" onClick={toggle} aria-haspopup="dialog" aria-expanded={open} aria-controls={id} aria-label="Open profile menu" className="flex size-10 items-center justify-center rounded-full bg-forest-hi text-[13px] font-medium text-white hover:ring-2 hover:ring-lime/50">{USER.initials}</button>
      )}>
        {(close) => (
          <div>
            <div className="px-3 py-2.5"><div className="text-sm">{USER.name}</div><div className="text-xs text-mute">{USER.role} · demo profile</div></div>
            <Link to="/settings" onClick={close} className={item}><SettingsIcon aria-hidden className="size-4 text-mute" />Settings</Link>
            <button type="button" className={item} onClick={() => { close(); setConfirm(true) }}><RotateCcw aria-hidden className="size-4 text-mute" />Reset demo data</button>
            <div className="flex items-start gap-3 border-t border-line px-3 py-2.5 text-xs text-mute"><ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />No sign-in. All data is simulated and stored only in this browser.</div>
          </div>
        )}
      </Popover>
      <ConfirmDialog open={confirm} danger title="Reset demo data?" confirmLabel="Reset" onCancel={() => setConfirm(false)}
        message="This clears saved settings, added batches, maintenance logs, and alert states from this browser, then reloads the simulation." onConfirm={() => { localStorage.removeItem('verdantos-v1'); location.reload() }} />
    </>
  )
}

export function TopBar({ onMenu, onSearch }: { onMenu: () => void; onSearch: () => void }) {
  const { pathname } = useLocation()
  const page = navFor(pathname)
  const fac = useFacility()
  return (
    <header className="sticky top-0 z-20 flex h-[76px] items-center gap-3 border-b border-line bg-canvas/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      <IconButton label="Open navigation" onClick={onMenu} className="-ml-2 lg:hidden"><Menu className="size-5" /></IconButton>
      <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-sm text-mute md:flex">
        <Link to="/" className="max-w-[180px] truncate hover:text-ink">{fac.name}</Link>
        <ChevronRight aria-hidden className="size-3.5 shrink-0" />
        <span className="truncate text-ink" aria-current="page">{page.label}</span>
      </nav>
      <span className="truncate text-base md:hidden">{page.label}</span>
      <div className="ml-auto flex items-center gap-2">
        <button type="button" onClick={onSearch} className="flex h-10 items-center gap-2.5 rounded-full border border-line bg-card px-4 text-[13px] text-mute hover:border-dim sm:w-56" aria-label="Search and quick navigation (Ctrl+K)">
          <Search aria-hidden className="size-4" /><span className="hidden flex-1 text-left sm:inline">Search…</span><kbd className="hidden rounded-md bg-chip px-1.5 py-0.5 text-[10.5px] text-mute sm:inline">Ctrl K</kbd>
        </button>
        <div className="hidden md:block"><FacilityMenu /></div>
        <SimControl />
        <ThemeToggle />
        <Notifications />
        <ProfileMenu />
      </div>
    </header>
  )
}
