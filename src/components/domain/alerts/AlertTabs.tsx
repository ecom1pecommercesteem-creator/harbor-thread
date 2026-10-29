import { useRef, type KeyboardEvent } from 'react'
import { cx } from '@/lib/format'
import { TABS, type TabId } from './alertModel'

/** Accessible tablist with roving tabindex; arrow / Home / End keys move and select. */
export function AlertTabs({ value, onChange, counts }: { value: TabId; onChange: (id: TabId) => void; counts: Record<TabId, number> }) {
  const refs = useRef<Partial<Record<TabId, HTMLButtonElement | null>>>({})

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = TABS.findIndex((t) => t.id === value)
    const n = TABS.length
    const next =
      e.key === 'ArrowRight' ? (i + 1) % n
      : e.key === 'ArrowLeft' ? (i - 1 + n) % n
      : e.key === 'Home' ? 0
      : e.key === 'End' ? n - 1
      : -1
    if (next < 0) return
    e.preventDefault()
    const id = TABS[next].id
    onChange(id)
    refs.current[id]?.focus()
  }

  return (
    <div role="tablist" aria-label="Alert views" onKeyDown={onKeyDown} className="flex gap-1 overflow-x-auto rounded-full bg-card-2 p-1">
      {TABS.map((t) => {
        const selected = t.id === value
        return (
          <button
            key={t.id}
            ref={(el) => { refs.current[t.id] = el }}
            type="button"
            role="tab"
            id={`alerts-tab-${t.id}`}
            aria-selected={selected}
            aria-controls="alerts-panel"
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={cx('inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-1.5 text-[13px] transition-colors', selected ? 'bg-lime font-medium text-lime-ink' : 'text-mute hover:text-ink')}
          >
            {t.label}
            <span className={cx('rounded-full px-1.5 text-[11px] tabular-nums', selected ? 'bg-lime-ink/15' : 'bg-chip')}>{counts[t.id]}</span>
          </button>
        )
      })}
    </div>
  )
}
