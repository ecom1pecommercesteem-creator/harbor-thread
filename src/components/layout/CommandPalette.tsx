import { CornerDownLeft, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CROP_BY_ID, ZONES } from '@/data/seed'
import { cx } from '@/lib/format'
import { NAV } from '@/lib/nav'
import { useFarm } from '@/store'
import { Modal } from '@/components/ui/Overlay'

interface Hit { key: string; group: string; label: string; hint?: string; to: string }

/** Ctrl/⌘+K quick navigation across pages, zones, batches, equipment and alerts. */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const navigate = useNavigate()
  const facilityId = useFarm((s) => s.facilityId)
  const batches = useFarm((s) => s.batches)
  const equipment = useFarm((s) => s.equipment)
  const alerts = useFarm((s) => s.alerts)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => { if (open) { setQ(''); setIdx(0) } }, [open])

  const hits = useMemo<Hit[]>(() => {
    const all: Hit[] = [
      ...NAV.map((n) => ({ key: n.to, group: 'Pages', label: n.label, hint: n.blurb, to: n.to })),
      ...ZONES.filter((z) => z.facilityId === facilityId).map((z) => ({ key: z.id, group: 'Zones', label: `Zone ${z.code} · ${z.name}`, hint: z.cropProfileId ? CROP_BY_ID.get(z.cropProfileId)!.name : 'Idle', to: `/zones?zone=${z.id}` })),
      ...batches.filter((b) => b.facilityId === facilityId && !b.harvestedAt).map((b) => ({ key: b.id, group: 'Batches', label: b.id, hint: CROP_BY_ID.get(b.cropProfileId)!.name, to: `/crops?batch=${b.id}` })),
      ...equipment.filter((e) => e.facilityId === facilityId).map((e) => ({ key: e.id, group: 'Equipment', label: e.name, hint: e.id, to: `/equipment?eq=${e.id}` })),
      ...alerts.filter((a) => a.facilityId === facilityId && a.status !== 'resolved').map((a) => ({ key: a.id, group: 'Alerts', label: a.title, hint: a.assetLabel, to: `/alerts?alert=${a.id}` })),
    ]
    const s = q.trim().toLowerCase()
    if (!s) return all.filter((h) => h.group === 'Pages')
    return all.filter((h) => `${h.label} ${h.hint ?? ''} ${h.key}`.toLowerCase().includes(s)).slice(0, 30)
  }, [q, facilityId, batches, equipment, alerts])

  useEffect(() => { setIdx(0) }, [q])
  useEffect(() => { listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }) }, [idx])

  const go = (h: Hit) => { onClose(); navigate(h.to) }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(hits.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)) }
    else if (e.key === 'Enter' && hits[idx]) { e.preventDefault(); go(hits[idx]) }
  }
  let lastGroup = ''
  return (
    <Modal open={open} onClose={onClose} title="Quick navigation" wide>
      <div onKeyDown={onKey}>
        <div className="relative">
          <Search aria-hidden className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-dim" />
          <input data-autofocus role="combobox" aria-expanded="true" aria-controls="cmd-list" aria-label="Search pages, zones, batches, equipment, alerts" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search zones, batches, equipment, alerts…" className="w-full rounded-full border border-line bg-card-2 py-2.5 pl-10 pr-4 text-sm placeholder:text-dim focus:border-lime" />
        </div>
        <ul id="cmd-list" data-lenis-prevent ref={listRef} role="listbox" aria-label="Results" className="mt-3 max-h-[50vh] overflow-y-auto">
          {hits.length === 0 && <li className="px-3 py-8 text-center text-sm text-mute">No matches for “{q}”.</li>}
          {hits.map((h, i) => {
            const header = h.group !== lastGroup ? h.group : null
            lastGroup = h.group
            return (
              <li key={`${h.group}-${h.key}`} role="presentation">
                {header && <div className="px-3 pb-1 pt-3 text-[11px] uppercase tracking-wider text-dim">{header}</div>}
                <button type="button" role="option" aria-selected={i === idx} onMouseEnter={() => setIdx(i)} onClick={() => go(h)} className={cx('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm', i === idx ? 'bg-chip' : '')}>
                  <span className="min-w-0 flex-1 truncate">{h.label}</span>
                  {h.hint && <span className="hidden max-w-[45%] truncate text-xs text-mute sm:inline">{h.hint}</span>}
                  {i === idx && <CornerDownLeft aria-hidden className="size-3.5 text-mute" />}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </Modal>
  )
}
