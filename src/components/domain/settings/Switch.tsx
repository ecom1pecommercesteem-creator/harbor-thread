import { useId } from 'react'
import { cx } from '@/lib/format'

/** Accessible on/off switch: a button with role="switch" and aria-checked, labelled by its text. */
export function Switch({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  const id = useId()
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <span id={id} className="text-sm text-ink">{label}</span>
        {description && <p id={`${id}-d`} className="mt-0.5 text-xs text-mute">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        aria-describedby={description ? `${id}-d` : undefined}
        onClick={() => onChange(!checked)}
        className={cx('inline-flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors', checked ? 'justify-end bg-lime' : 'justify-start bg-chip')}
      >
        <span aria-hidden className={cx('size-5 rounded-full transition-colors', checked ? 'bg-lime-ink' : 'bg-mute')} />
      </button>
    </div>
  )
}
