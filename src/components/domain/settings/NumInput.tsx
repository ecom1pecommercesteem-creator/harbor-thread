import { useState } from 'react'
import { Input } from '@/components/ui/Form'

/**
 * Numeric text input that keeps its own text so partial input ("1.", "") is not clobbered.
 * Empty or non-numeric text reports NaN, which validation rejects. Remount (key) to resync after discard/reset.
 */
export function NumInput({ id, describedBy, field, value, onValue, invalid }: { id: string; describedBy?: string; field: string; value: number; onValue: (n: number) => void; invalid: boolean }) {
  const [text, setText] = useState(() => (Number.isFinite(value) ? String(value) : ''))
  return (
    <Input
      id={id}
      data-field={field}
      inputMode="decimal"
      autoComplete="off"
      aria-describedby={describedBy}
      aria-invalid={invalid}
      value={text}
      onChange={(e) => {
        const t = e.target.value.trim()
        setText(e.target.value)
        onValue(t === '' ? NaN : Number(t))
      }}
    />
  )
}
