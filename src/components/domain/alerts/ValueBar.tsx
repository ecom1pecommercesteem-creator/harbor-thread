import { cx } from '@/lib/format'
import type { Range, Severity } from '@/types'

/** Horizontal gauge: shaded acceptable band, marker at the measured value. */
export function ValueBar({ value, band, domain, text, severity, label }: { value: number; band: Range | null; domain?: Range; text: string; severity?: Severity; label: string }) {
  const lo = Math.min(value, band?.min ?? value)
  const hi = Math.max(value, band?.max ?? value)
  const pad = Math.max((band ? band.max - band.min : 0) * 0.5, 0.5)
  const d = domain ?? { min: lo - pad, max: hi + pad }
  const span = d.max - d.min || 1
  const pct = (v: number) => Math.min(100, Math.max(0, ((v - d.min) / span) * 100))
  const tone = severity === 'critical' ? 'bg-crit' : severity === 'warning' ? 'bg-warn' : 'bg-lime'
  return (
    <div>
      <div role="img" aria-label={`${label}: ${text}`} className="relative h-3 rounded-full bg-chip">
        {band && <div className="absolute inset-y-0 rounded-full bg-lime/25" style={{ left: `${pct(band.min)}%`, width: `${pct(band.max) - pct(band.min)}%` }} />}
        <div className={cx('absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-canvas', tone)} style={{ left: `${pct(value)}%` }} />
      </div>
      <p className="mt-2 text-[11px] text-dim">{band ? 'Shaded band = acceptable range' : 'No target band for this alert'}</p>
    </div>
  )
}
