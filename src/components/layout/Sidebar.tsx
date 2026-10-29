import { ChevronsLeft, ChevronsRight, X } from 'lucide-react'
import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { cx } from '@/lib/format'
import { NAV } from '@/lib/nav'
import { useFarm } from '@/store'
import { useUnreadCount } from '@/store/hooks'
import { Brand } from './Brand'
import { FacilityMenu } from './FacilityMenu'

function NavList({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const unread = useUnreadCount()
  return (
    <nav aria-label="Primary" data-lenis-prevent className="flex-1 overflow-y-auto px-3 py-2">
      <ul className="flex flex-col gap-1">
        {NAV.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink to={to} end={to === '/'} onClick={onNavigate} title={collapsed ? label : undefined}
              className={({ isActive }) => cx('group relative flex h-11 items-center gap-3 rounded-full px-3.5 text-[14.5px] transition-colors', isActive ? 'bg-lime font-medium text-lime-ink' : 'text-mute hover:bg-card-2 hover:text-ink', collapsed && 'justify-center px-0')}>
              <Icon aria-hidden className="size-5 shrink-0" strokeWidth={1.8} />
              <span className={cx('flex-1 truncate', collapsed && 'sr-only')}>{label}</span>
              {to === '/alerts' && unread > 0 && (
                <span aria-label={`${unread} unread alerts`} className={cx('flex h-5 min-w-5 items-center justify-center rounded-full bg-crit px-1.5 text-[11px] font-semibold text-white', collapsed && 'absolute right-1 top-1 h-4 min-w-4 px-1 text-[10px]')}>{unread}</span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** Desktop sidebar (collapsible). */
export function Sidebar() {
  const collapsed = useFarm((s) => s.sidebarCollapsed)
  const toggle = useFarm((s) => s.toggleSidebar)
  return (
    <aside className={cx('text-ink sticky top-0 z-30 hidden h-dvh shrink-0 flex-col border-r border-line bg-panel transition-[width] duration-200 lg:flex', collapsed ? 'w-[84px]' : 'w-[272px]')}>
      <div className={cx('flex h-[76px] items-center px-5', collapsed && 'justify-center px-0')}><Brand collapsed={collapsed} /></div>
      <NavList collapsed={collapsed} />
      <div className="space-y-2 border-t border-line p-3">
        <FacilityMenu compact collapsed={collapsed} up />
        <button type="button" onClick={toggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-pressed={collapsed}
          className={cx('flex h-9 w-full items-center gap-2 rounded-full px-3.5 text-[13px] text-dim hover:bg-card-2 hover:text-ink', collapsed && 'justify-center px-0')}>
          {collapsed ? <ChevronsRight className="size-4" /> : <><ChevronsLeft className="size-4" />Collapse</>}
        </button>
      </div>
    </aside>
  )
}

/** Mobile/tablet slide-in navigation. */
export function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { pathname } = useLocation()
  useEffect(() => { onClose() }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])
  return (
    <div className={cx('fixed inset-0 z-50 lg:hidden', open ? '' : 'pointer-events-none')} inert={!open}>
      <div className={cx('absolute inset-0 bg-black/60 transition-opacity', open ? 'opacity-100' : 'opacity-0')} onClick={onClose} />
      <aside role="dialog" aria-modal="true" aria-label="Navigation" className={cx('text-ink absolute inset-y-0 left-0 flex w-[288px] max-w-[85vw] flex-col border-r border-line bg-panel transition-transform duration-200', open ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex h-[76px] items-center justify-between px-5"><Brand /><button type="button" aria-label="Close navigation" onClick={onClose} className="flex size-10 items-center justify-center rounded-full text-mute hover:bg-chip"><X className="size-5" /></button></div>
        <NavList onNavigate={onClose} />
        <div className="border-t border-line p-3"><FacilityMenu compact up /></div>
      </aside>
    </div>
  )
}
