import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cx } from '@/lib/format'
import { setScrollLocked } from '@/lib/scroll'
import { Button, IconButton } from './Button'

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/** Escape-to-close, Tab focus trap, scroll lock and focus restore for modal surfaces. */
function useModal(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const el = ref.current
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    setScrollLocked(true)
    ;(el?.querySelector<HTMLElement>('[data-autofocus]') ?? el?.querySelector<HTMLElement>(FOCUSABLE))?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); closeRef.current() }
      if (e.key !== 'Tab' || !el) return
      const items = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)]
      if (!items.length) return
      const first = items[0], last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      setScrollLocked(false)
      prev?.focus?.()
    }
  }, [open])
  return ref
}

function Panel({ open, onClose, label, children, className, side }: { open: boolean; onClose: () => void; label: string; children: ReactNode; className?: string; side: 'right' | 'center' }) {
  const ref = useModal(open, onClose)
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className={cx('fixed inset-0 z-50 flex', side === 'right' ? 'justify-end' : 'items-center justify-center p-4')}>
          <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} aria-hidden />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            className={cx('relative flex max-h-full flex-col overflow-hidden border border-line bg-card shadow-2xl', side === 'right' ? 'h-full w-full max-w-[560px] rounded-l-card' : 'w-full max-w-md rounded-card', className)}
            initial={side === 'right' ? { x: 48, opacity: 0 } : { y: 16, opacity: 0, scale: 0.98 }}
            animate={side === 'right' ? { x: 0, opacity: 1 } : { y: 0, opacity: 1, scale: 1 }}
            exit={side === 'right' ? { x: 48, opacity: 0 } : { y: 16, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export function Drawer({ open, onClose, title, subtitle, children, footer, wide }: { open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  return (
    <Panel open={open} onClose={onClose} label={typeof title === 'string' ? title : 'Details'} side="right" className={wide ? 'max-w-[680px]' : undefined}>
      <header className="flex items-start justify-between gap-3 border-b border-line px-6 py-5">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-light">{title}</h2>
          {subtitle && <div className="mt-1 text-[13px] text-mute">{subtitle}</div>}
        </div>
        <IconButton label="Close panel" onClick={onClose} className="-mr-2 -mt-1 shrink-0"><X className="size-5" /></IconButton>
      </header>
      <div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto px-6 pb-5 pt-3 [mask-image:linear-gradient(to_bottom,#000_calc(100%_-_24px),transparent)]">{children}</div>
      {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-line px-6 py-4">{footer}</footer>}
    </Panel>
  )
}

export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  return (
    <Panel open={open} onClose={onClose} label={title} side="center" className={wide ? 'max-w-xl' : undefined}>
      <header className="flex items-center justify-between gap-3 px-6 pt-5">
        <h2 className="text-xl font-light">{title}</h2>
        <IconButton label="Close dialog" onClick={onClose} className="-mr-2"><X className="size-5" /></IconButton>
      </header>
      <div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto px-6 py-4">{children}</div>
      {footer && <footer className="flex flex-wrap justify-end gap-2 px-6 pb-5">{footer}</footer>}
    </Panel>
  )
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger, onConfirm, onCancel }: { open: boolean; title: string; message: ReactNode; confirmLabel?: string; danger?: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Modal open={open} onClose={onCancel} title={title} footer={<><Button variant="ghost" onClick={onCancel}>Cancel</Button><Button data-autofocus variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button></>}>
      <p className="text-sm leading-relaxed text-mute">{message}</p>
    </Modal>
  )
}
