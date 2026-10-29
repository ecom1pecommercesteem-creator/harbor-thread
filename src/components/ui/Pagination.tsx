import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { cx } from '@/lib/format'

/**
 * Client-side paging. The page resets to 1 whenever `resetKey` changes (pass the active
 * filters/sort/view) and is clamped when the list shrinks, e.g. after live data updates.
 */
export function usePagination<T>(items: T[], resetKey: string, pageSize: number) {
  const [page, setPage] = useState(1)
  const [key, setKey] = useState(resetKey)
  if (key !== resetKey) {
    setKey(resetKey)
    setPage(1)
  }
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const current = Math.min(page, pageCount)
  return {
    pageItems: items.slice((current - 1) * pageSize, current * pageSize),
    pagerProps: { page: current, pageCount, total: items.length, pageSize, onPage: setPage },
  }
}

interface Props {
  page: number
  pageCount: number
  total: number
  pageSize: number
  onPage: (page: number) => void
}

/** 1 … 4 5 6 … 12 */
function pageWindow(page: number, count: number): (number | null)[] {
  const keep = new Set([1, count, page - 1, page, page + 1])
  const out: (number | null)[] = []
  for (let p = 1; p <= count; p++) {
    if (keep.has(p)) out.push(p)
    else if (out[out.length - 1] !== null) out.push(null)
  }
  return out
}

const btn = 'inline-flex size-8 items-center justify-center rounded-full text-[13px] tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-40'

export function Pagination({ page, pageCount, total, pageSize, onPage }: Props) {
  if (pageCount <= 1) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 pt-2">
      <p className="text-xs text-mute" aria-live="polite">{from}–{to} of {total}</p>
      <div className="flex items-center gap-1">
        <button type="button" aria-label="Previous page" disabled={page === 1} onClick={() => onPage(page - 1)} className={cx(btn, 'text-mute hover:bg-chip hover:text-ink')}>
          <ChevronLeft aria-hidden className="size-4" />
        </button>
        {pageWindow(page, pageCount).map((p, i) =>
          p === null ? (
            <span key={`gap-${i}`} aria-hidden className="px-1 text-dim">…</span>
          ) : (
            <button
              key={p}
              type="button"
              aria-label={`Page ${p}`}
              aria-current={p === page ? 'page' : undefined}
              onClick={() => onPage(p)}
              className={cx(btn, p === page ? 'bg-lime text-lime-ink font-medium' : 'text-mute hover:bg-chip hover:text-ink')}
            >
              {p}
            </button>
          ),
        )}
        <button type="button" aria-label="Next page" disabled={page === pageCount} onClick={() => onPage(page + 1)} className={cx(btn, 'text-mute hover:bg-chip hover:text-ink')}>
          <ChevronRight aria-hidden className="size-4" />
        </button>
      </div>
    </nav>
  )
}
