import { addDays, format, parseISO } from 'date-fns'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Display'
import { Field, Input, Select, Textarea } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Overlay'
import { CROPS, CROP_BY_ID, ZONE_BY_ID } from '@/data/seed'
import { useFarm } from '@/store'
import { useZones } from '@/store/hooks'
import type { Zone } from '@/types'

const FORM_ID = 'add-batch-form'
const DATE_FMT = 'yyyy-MM-dd'
const MAX_FUTURE_DAYS = 7
const MAX_TRAYS = 200
const MAX_YIELD_KG = 5000
const MAX_NOTES = 200

const FIELD_ORDER = ['zoneId', 'cropId', 'plantedAt', 'harvestEta', 'trays', 'yieldKg', 'notes'] as const
type FieldKey = (typeof FIELD_ORDER)[number]
type Values = Record<FieldKey, string>
type Edited = { eta: boolean; yield: boolean; crop: boolean }
const NO_EDITS: Edited = { eta: false, yield: false, crop: false }

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s)

/** Re-derive the auto-filled fields (harvest estimate, yield suggestion) unless the user typed over them. */
function withAuto(v: Values, edited: Edited): Values {
  const crop = CROP_BY_ID.get(v.cropId)
  const zone = ZONE_BY_ID.get(v.zoneId)
  let out = v
  if (!edited.eta && crop && isDate(v.plantedAt)) {
    out = { ...out, harvestEta: format(addDays(parseISO(v.plantedAt), crop.cycleDays), DATE_FMT) }
  }
  if (!edited.yield && crop && zone) {
    out = { ...out, yieldKg: String(Math.round(crop.yieldKgPerM2 * zone.areaM2 * 0.5)) }
  }
  return out
}

function initialValues(zones: Zone[], defaultZoneId: string): Values {
  const zone = zones.find((z) => z.id === defaultZoneId) ?? zones[0]
  return withAuto(
    { zoneId: zone.id, cropId: zone.cropProfileId ?? CROPS[0].id, plantedAt: format(new Date(), DATE_FMT), harvestEta: '', trays: '', yieldKg: '', notes: '' },
    NO_EDITS,
  )
}

function validate(v: Values, activeZoneIds: Set<string>, maxPlant: string): Partial<Record<FieldKey, string>> {
  const e: Partial<Record<FieldKey, string>> = {}
  if (!activeZoneIds.has(v.zoneId)) e.zoneId = 'Choose an active zone.'
  if (!CROP_BY_ID.has(v.cropId)) e.cropId = 'Choose a crop.'
  if (!v.plantedAt) e.plantedAt = 'Enter a planting date.'
  else if (v.plantedAt > maxPlant) e.plantedAt = `Planting can be at most ${MAX_FUTURE_DAYS} days ahead (latest ${maxPlant}).`
  if (!v.harvestEta) e.harvestEta = 'Enter an estimated harvest date.'
  else if (v.plantedAt && v.harvestEta <= v.plantedAt) e.harvestEta = 'Harvest estimate must be after the planting date.'
  const trays = v.trays.trim()
  if (!/^\d+$/.test(trays) || Number(trays) < 1 || Number(trays) > MAX_TRAYS) e.trays = `Enter a whole number of trays from 1 to ${MAX_TRAYS}.`
  const y = Number(v.yieldKg)
  if (!v.yieldKg.trim() || !Number.isFinite(y) || y <= 0 || y > MAX_YIELD_KG) e.yieldKg = `Enter a yield above 0 and up to ${MAX_YIELD_KG} kg.`
  if (v.notes.trim().length > MAX_NOTES) e.notes = `Keep notes to ${MAX_NOTES} characters or fewer.`
  return e
}

export function AddBatchModal({ open, onClose, defaultZoneId, onCreated }: { open: boolean; onClose: () => void; defaultZoneId: string; onCreated: (id: string) => void }) {
  const zones = useZones().filter((z) => z.cropProfileId !== null)
  const hasZones = zones.length > 0
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add batch"
      wide
      footer={
        hasZones ? (
          <>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" form={FORM_ID} variant="primary">Add batch</Button>
          </>
        ) : (
          <Button onClick={onClose}>Close</Button>
        )
      }
    >
      {open &&
        (hasZones ? (
          <BatchForm
            zones={zones}
            defaultZoneId={defaultZoneId}
            onCreated={(id) => {
              onClose()
              onCreated(id)
            }}
          />
        ) : (
          <EmptyState title="No active zones" message="Batches can only be added to a zone that has a crop profile. This facility has no active zones." />
        ))}
    </Modal>
  )
}

function BatchForm({ zones, defaultZoneId, onCreated }: { zones: Zone[]; defaultZoneId: string; onCreated: (id: string) => void }) {
  // Remounted on every open (the Modal only renders children while open), so state starts fresh.
  const [values, setValues] = useState<Values>(() => initialValues(zones, defaultZoneId))
  const [edited, setEdited] = useState<Edited>(NO_EDITS)
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)

  const [today] = useState(() => new Date())
  const maxPlant = format(addDays(today, MAX_FUTURE_DAYS), DATE_FMT)
  const activeIds = new Set(zones.map((z) => z.id))
  const errors = validate(values, activeIds, maxPlant)
  const err = (k: FieldKey) => (touched[k] || submitted ? errors[k] : undefined)
  const blur = (k: FieldKey) => () => setTouched((t) => ({ ...t, [k]: true }))
  const set = (k: FieldKey) => (val: string) => setValues((v) => ({ ...v, [k]: val }))
  const patch = (p: Partial<Values>) => setValues((v) => withAuto({ ...v, ...p }, edited))

  const crop = CROP_BY_ID.get(values.cropId)
  const zone = ZONE_BY_ID.get(values.zoneId)

  const onZone = (zoneId: string) => {
    const z = ZONE_BY_ID.get(zoneId)
    patch({ zoneId, ...(!edited.crop && z?.cropProfileId ? { cropId: z.cropProfileId } : {}) })
  }
  const onCrop = (cropId: string) => {
    setEdited((e) => ({ ...e, crop: true }))
    patch({ cropId })
  }
  const onEta = (harvestEta: string) => {
    setEdited((e) => ({ ...e, eta: true }))
    setValues((v) => ({ ...v, harvestEta }))
  }
  const onYield = (yieldKg: string) => {
    setEdited((e) => ({ ...e, yield: true }))
    setValues((v) => ({ ...v, yieldKg }))
  }

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitted(true)
    const errs = validate(values, activeIds, maxPlant)
    const first = FIELD_ORDER.find((k) => errs[k])
    if (first) {
      e.currentTarget.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
      return
    }
    const batch = useFarm.getState().addBatch({
      zoneId: values.zoneId,
      cropProfileId: values.cropId,
      plantedAt: values.plantedAt,
      harvestEta: values.harvestEta,
      trays: Number(values.trays),
      expectedYieldKg: Number(values.yieldKg),
      notes: values.notes.trim() || undefined,
    })
    onCreated(batch.id)
  }

  return (
    <form id={FORM_ID} noValidate onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <Field label="Zone" error={err('zoneId')} className="sm:col-span-2">
        {(id, describedBy) => (
          <Select id={id} name="zoneId" data-autofocus aria-describedby={describedBy} aria-invalid={!!err('zoneId')} value={values.zoneId} onChange={(e) => onZone(e.target.value)} onBlur={blur('zoneId')}>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>{`Zone ${z.code} · ${z.name}`}</option>
            ))}
          </Select>
        )}
      </Field>

      <Field label="Crop" error={err('cropId')} className="sm:col-span-2" hint={!edited.crop && zone ? 'Defaults to the zone’s current crop. Change it to override.' : undefined}>
        {(id, describedBy) => (
          <Select id={id} name="cropId" aria-describedby={describedBy} aria-invalid={!!err('cropId')} value={values.cropId} onChange={(e) => onCrop(e.target.value)} onBlur={blur('cropId')}>
            {CROPS.map((c) => (
              <option key={c.id} value={c.id}>{`${c.name} · ${c.variety}`}</option>
            ))}
          </Select>
        )}
      </Field>

      <Field label="Planting date" error={err('plantedAt')} hint={`Up to ${MAX_FUTURE_DAYS} days in the future.`}>
        {(id, describedBy) => (
          <Input id={id} name="plantedAt" type="date" max={maxPlant} aria-describedby={describedBy} aria-invalid={!!err('plantedAt')} value={values.plantedAt} onChange={(e) => patch({ plantedAt: e.target.value })} onBlur={blur('plantedAt')} />
        )}
      </Field>

      <Field
        label="Estimated harvest"
        error={err('harvestEta')}
        hint={crop && !edited.eta ? `Auto-filled from the ${crop.cycleDays}-day cycle. Edit to override.` : 'Must be after the planting date.'}
      >
        {(id, describedBy) => (
          <Input id={id} name="harvestEta" type="date" aria-describedby={describedBy} aria-invalid={!!err('harvestEta')} value={values.harvestEta} onChange={(e) => onEta(e.target.value)} onBlur={blur('harvestEta')} />
        )}
      </Field>

      <Field label="Trays" error={err('trays')} hint={`Whole number, 1–${MAX_TRAYS}.`}>
        {(id, describedBy) => (
          <Input id={id} name="trays" type="number" inputMode="numeric" min={1} max={MAX_TRAYS} step={1} aria-describedby={describedBy} aria-invalid={!!err('trays')} value={values.trays} onChange={(e) => set('trays')(e.target.value)} onBlur={blur('trays')} />
        )}
      </Field>

      <Field
        label="Expected yield (kg)"
        error={err('yieldKg')}
        hint={zone && crop && !edited.yield ? `Suggested: ${crop.yieldKgPerM2} kg/m² × ${zone.areaM2} m² × 50 % (demo estimate).` : `Above 0 and up to ${MAX_YIELD_KG} kg.`}
      >
        {(id, describedBy) => (
          <Input id={id} name="yieldKg" type="number" inputMode="decimal" min={0} step="any" aria-describedby={describedBy} aria-invalid={!!err('yieldKg')} value={values.yieldKg} onChange={(e) => onYield(e.target.value)} onBlur={blur('yieldKg')} />
        )}
      </Field>

      <Field label="Notes (optional)" error={err('notes')} hint={`${values.notes.trim().length}/${MAX_NOTES} characters`} className="sm:col-span-2">
        {(id, describedBy) => (
          <Textarea id={id} name="notes" rows={3} aria-describedby={describedBy} aria-invalid={!!err('notes')} value={values.notes} onChange={(e) => set('notes')(e.target.value)} onBlur={blur('notes')} />
        )}
      </Field>
    </form>
  )
}
