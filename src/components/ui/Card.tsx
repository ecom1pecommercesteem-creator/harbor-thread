import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '@/lib/format'

export function Card({ className, ...p }: HTMLAttributes<HTMLElement>) {
  return <section className={cx('rounded-card border border-line bg-card', className)} {...p} />
}

export function CardHeader({ title, subtitle, action, className }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cx('flex flex-wrap items-start justify-between gap-3 px-5 pt-5', className)}>
      <div className="min-w-0">
        <h2 className="text-[17px] font-normal leading-tight text-ink">{title}</h2>
        {subtitle && <p className="mt-1 text-[13px] text-mute">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
