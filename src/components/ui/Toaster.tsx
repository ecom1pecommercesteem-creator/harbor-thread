import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect } from 'react'
import { cx } from '@/lib/format'
import { useFarm } from '@/store'
import type { Toast } from '@/types'

const ICON = { success: CheckCircle2, error: TriangleAlert, info: Info }
const TONE = { success: 'text-ok', error: 'text-crit', info: 'text-lime' }

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useFarm((s) => s.dismissToast)
  useEffect(() => {
    const id = setTimeout(() => dismiss(toast.id), 4500)
    return () => clearTimeout(id)
  }, [toast.id, dismiss])
  const Icon = ICON[toast.kind]
  return (
    <motion.li layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 24 }} className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-line bg-card-2 py-3 pl-4 pr-2 shadow-xl">
      <Icon aria-hidden className={cx('mt-0.5 size-[18px] shrink-0', TONE[toast.kind])} />
      <p className="flex-1 text-sm">{toast.message}</p>
      <button type="button" aria-label="Dismiss notification" onClick={() => dismiss(toast.id)} className="rounded-full p-1.5 text-mute hover:bg-chip hover:text-ink"><X className="size-3.5" /></button>
    </motion.li>
  )
}

export function Toaster() {
  const toasts = useFarm((s) => s.toasts)
  return (
    <ul aria-live="polite" role="status" className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2">
      <AnimatePresence initial={false}>{toasts.map((t) => <ToastItem key={t.id} toast={t} />)}</AnimatePresence>
    </ul>
  )
}
