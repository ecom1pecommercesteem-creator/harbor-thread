import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cx } from '@/lib/format'

/** Click-outside / Escape dismissible popover. `children` receives a close() callback. */
export function Popover({ trigger, children, align = 'right', up, className, label }: { trigger: (p: { open: boolean; toggle: () => void; id: string }) => ReactNode; children: (close: () => void) => ReactNode; align?: 'left' | 'right'; up?: boolean; className?: string; label: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])
  const id = `pop-${label.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((o) => !o), id })}
      {open && (
        <div id={id} role="dialog" aria-label={label} className={cx('absolute z-40 w-72 rounded-2xl border border-line bg-card-2 p-1.5 shadow-2xl', up ? 'bottom-full mb-2' : 'top-full mt-2', align === 'right' ? 'right-0' : 'left-0', className)}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}
