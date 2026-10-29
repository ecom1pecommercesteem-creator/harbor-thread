import { Sprout } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cx } from '@/lib/format'

export function Brand({ collapsed }: { collapsed?: boolean }) {
  return (
    <Link to="/" aria-label="VerdantOS — Overview" className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-lime text-lime-ink"><Sprout className="size-[22px]" strokeWidth={2.2} /></span>
      <span className={cx('text-[21px] font-light tracking-tight', collapsed && 'hidden')}>Verdant<span className="text-lime">OS</span></span>
    </Link>
  )
}
