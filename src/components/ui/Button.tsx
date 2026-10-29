import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '@/lib/format'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'md'
  icon?: ReactNode
}
const V: Record<Variant, string> = {
  primary: 'bg-lime text-lime-ink hover:brightness-110 font-medium',
  secondary: 'bg-chip text-ink hover:bg-dim/30',
  ghost: 'text-mute hover:bg-chip hover:text-ink',
  danger: 'bg-crit/15 text-crit hover:bg-crit/25',
}
export function Button({ variant = 'secondary', size = 'md', icon, className, children, type = 'button', ...p }: Props) {
  return (
    <button
      type={type}
      className={cx('inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40', size === 'sm' ? 'h-8 px-3.5 text-[13px]' : 'h-10 px-5 text-sm', V[variant], className)}
      {...p}
    >
      {icon}
      {children}
    </button>
  )
}

export function IconButton({ label, className, children, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button type="button" aria-label={label} title={label} className={cx('inline-flex size-10 items-center justify-center rounded-full text-mute transition-colors hover:bg-chip hover:text-ink', className)} {...p}>
      {children}
    </button>
  )
}
