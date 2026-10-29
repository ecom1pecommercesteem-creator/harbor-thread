import { useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Form'
import type { MaintenanceInput } from '@/store'
import type { Equipment } from '@/types'
import { STATUS_LABEL, STATUS_ORDER } from './model'

const NOTE_MIN = 5
const NOTE_MAX = 300
const DAYS_MIN = 1
const DAYS_MAX = 365

interface Errors {
  note?: string
  nextDays?: string
}

export function MaintenanceForm({ equipment, onSubmit, onCancel }: { equipment: Equipment; onSubmit: (input: MaintenanceInput) => void; onCancel: () => void }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [note, setNote] = useState('')
  const [status, setStatus] = useState('')
  const [days, setDays] = useState('')
  const [errors, setErrors] = useState<Errors>({})

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmed = note.trim()
    const next: Errors = {}
    if (trimmed.length < NOTE_MIN) next.note = `Add a note of at least ${NOTE_MIN} characters.`
    else if (trimmed.length > NOTE_MAX) next.note = `Keep the note to ${NOTE_MAX} characters or fewer.`
    let nextDueDays: number | undefined
    if (days.trim()) {
      const n = Number(days)
      if (Number.isInteger(n) && n >= DAYS_MIN && n <= DAYS_MAX) nextDueDays = n
      else next.nextDays = `Enter a whole number of days from ${DAYS_MIN} to ${DAYS_MAX}.`
    }
    setErrors(next)
    if (next.note || next.nextDays) {
      // Focus the first invalid field by its name; avoids depending on a re-render.
      const first = next.note ? 'note' : 'nextDays'
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
      return
    }
    const chosen = STATUS_ORDER.find((s) => s === status)
    onSubmit({ equipmentId: equipment.id, note: trimmed, status: chosen, nextDueDays })
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="space-y-4">
      <Field label="Note" error={errors.note} hint={`Required. ${NOTE_MIN}–${NOTE_MAX} characters.`}>
        {(id, describedBy) => (
          <Textarea id={id} name="note" required aria-required="true" aria-describedby={describedBy} aria-invalid={!!errors.note} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What was done on this asset?" />
        )}
      </Field>
      <Field label="New status" hint="Offline and critical changes ask for confirmation first.">
        {(id, describedBy) => (
          <Select id={id} name="status" aria-describedby={describedBy} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Keep current ({STATUS_LABEL[equipment.status]})</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Next service in (days)" error={errors.nextDays} hint={`Optional. ${DAYS_MIN}–${DAYS_MAX} days from now.`}>
        {(id, describedBy) => (
          <Input id={id} name="nextDays" type="number" inputMode="numeric" min={DAYS_MIN} max={DAYS_MAX} step={1} aria-describedby={describedBy} aria-invalid={!!errors.nextDays} value={days} onChange={(e) => setDays(e.target.value)} />
        )}
      </Field>
      <p className="text-xs text-dim">Stored locally in this browser — demo only.</p>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary">Save entry</Button>
      </div>
    </form>
  )
}
