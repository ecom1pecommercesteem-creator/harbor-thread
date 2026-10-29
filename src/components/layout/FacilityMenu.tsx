import { Check, ChevronsUpDown, Warehouse } from 'lucide-react'
import { FACILITIES } from '@/data/seed'
import { cx } from '@/lib/format'
import { useFarm } from '@/store'
import { useFacility } from '@/store/hooks'
import { Popover } from './Popover'

/** Facility selector. `compact` renders the sidebar variant. */
export function FacilityMenu({ compact, collapsed, up }: { compact?: boolean; collapsed?: boolean; up?: boolean }) {
  const fac = useFacility()
  const setFacility = useFarm((s) => s.setFacility)
  const toast = useFarm((s) => s.toast)
  return (
    <Popover label="Select facility" align="left" up={up} trigger={({ open, toggle, id }) => (
      <button type="button" onClick={toggle} aria-haspopup="dialog" aria-expanded={open} aria-controls={id} title={fac.name}
        className={cx('flex items-center gap-2.5 rounded-2xl text-left transition-colors', compact ? 'w-full bg-card-2/70 p-2.5 hover:bg-card-2' : 'h-10 border border-line bg-card px-3.5 hover:border-dim', collapsed && 'justify-center')}>
        <Warehouse aria-hidden className="size-[18px] shrink-0 text-lime" />
        {!collapsed && <span className={cx('min-w-0 flex-1 truncate text-[13px]', !compact && 'max-w-[160px]')}><span className="block truncate text-ink">{fac.name}</span>{compact && <span className="block truncate text-[11px] text-mute">{fac.city}</span>}</span>}
        {!collapsed && <ChevronsUpDown aria-hidden className="size-4 shrink-0 text-mute" />}
      </button>
    )}>
      {(close) => (
        <ul>
          {FACILITIES.map((f) => (
            <li key={f.id}>
              <button type="button" onClick={() => { if (f.id !== fac.id) { setFacility(f.id); toast('info', `Switched to ${f.name}.`) } close() }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-chip">
                <span className="min-w-0 flex-1"><span className="block truncate">{f.name}</span><span className="block text-xs text-mute">{f.city} · {f.areaM2.toLocaleString()} m²</span></span>
                {f.id === fac.id && <Check aria-hidden className="size-4 text-lime" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Popover>
  )
}
