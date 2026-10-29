import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Form'
import { CROPS, CROP_BY_ID } from '@/data/seed'
import { cx } from '@/lib/format'
import { METRICS, METRIC_META } from '@/lib/metrics'
import type { Metric, Settings } from '@/types'
import { SectionCard } from './FormSections'
import { NumInput } from './NumInput'
import { withTargetValue, type Errors } from './settingsModel'

type Targets = Settings['targets']

export function TargetsSection({ targets, onChange, errors, open, onToggle }: { targets: Targets; onChange: (t: Targets) => void; errors: Errors; open: string[]; onToggle: (cropId: string) => void }) {
  return (
    <SectionCard
      id="targets"
      title="Environmental target ranges"
      subtitle="Illustrative demonstration values — not agronomic advice. Temperatures are always in °C."
    >
      <div className="space-y-2">
        {CROPS.map((crop) => {
          const isOpen = open.includes(crop.id)
          const custom = Object.keys(targets[crop.id] ?? {}).length
          const panelId = `crop-panel-${crop.id}`
          return (
            <div key={crop.id} className="overflow-hidden rounded-xl border border-line">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => onToggle(crop.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-card-2"
              >
                <span className="text-sm">
                  <span className="text-ink">{crop.name}</span> <span className="text-mute">{crop.variety}</span>
                </span>
                <span className="flex items-center gap-2 text-xs text-mute">
                  {custom > 0 && <span className="rounded-full bg-lime/15 px-2 py-0.5 text-lime">{custom} custom</span>}
                  <ChevronDown aria-hidden className={cx('size-4 transition-transform', isOpen && 'rotate-180')} />
                </span>
              </button>
              {isOpen && (
                <div id={panelId} className="space-y-4 border-t border-line px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-dim">Defaults are shown beside each input. Only values you change are saved.</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={custom === 0}
                      onClick={() => onChange(Object.fromEntries(Object.entries(targets).filter(([id]) => id !== crop.id)))}
                    >
                      Reset to demo defaults
                    </Button>
                  </div>
                  {METRICS.map((m) => (
                    <MetricRow key={m} cropId={crop.id} metric={m} targets={targets} onChange={onChange} errors={errors} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </SectionCard>
  )
}

function MetricRow({ cropId, metric, targets, onChange, errors }: { cropId: string; metric: Metric; targets: Targets; onChange: (t: Targets) => void; errors: Errors }) {
  const meta = METRIC_META[metric]
  const def = CROP_BY_ID.get(cropId)!.targets[metric]
  const cur = targets[cropId]?.[metric] ?? def
  const unit = meta.unit ? ` (${meta.unit})` : ''
  const fmt = (n: number) => n.toFixed(meta.decimals)
  const bound = (side: 'min' | 'max') => {
    const k = `targets.${cropId}.${metric}.${side}`
    return (
      <Field label={`${side === 'min' ? 'Min' : 'Max'}${unit}`} error={errors[k]}>
        {(id, describedBy) => (
          <NumInput id={id} describedBy={describedBy} field={k} value={cur[side]} invalid={!!errors[k]} onValue={(v) => onChange(withTargetValue(targets, cropId, metric, side, v))} />
        )}
      </Field>
    )
  }
  return (
    <div role="group" aria-label={meta.label} className="grid gap-3 border-t border-line/60 pt-4 first:border-0 first:pt-0 sm:grid-cols-[minmax(0,1fr)_9rem_9rem] sm:items-end">
      <div className="min-w-0 pb-1">
        <p className="text-sm text-ink">{meta.label}</p>
        <p className="text-xs text-dim">Default {fmt(def.min)}–{fmt(def.max)}{meta.unit ? ` ${meta.unit}` : ''}</p>
      </div>
      {bound('min')}
      {bound('max')}
    </div>
  )
}
