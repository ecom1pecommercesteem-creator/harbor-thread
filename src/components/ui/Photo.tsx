import type { ReactNode } from 'react'
import { cx } from '@/lib/format'
import { CROP_PHOTO, HERO_PHOTO } from '@/lib/photos'
import type { CropProfile } from '@/types'
import { SimTag } from './Badge'

/** Small rounded crop photo for cards. Decorative: the crop name is always printed next to it. */
export const CropThumb = ({ category, className }: { category: CropProfile['category']; className?: string }) => (
  <img src={CROP_PHOTO[category]} alt="" loading="lazy" decoding="async" className={cx('size-11 shrink-0 rounded-2xl bg-chip object-cover', className)} />
)

/** Wide crop photo at the top of detail drawers. */
export const CropBanner = ({ category }: { category: CropProfile['category'] }) => (
  <figure className="-mx-6 -mt-3 mb-6">
    <img src={CROP_PHOTO[category]} alt={`${category} — illustrative stock photo`} loading="lazy" decoding="async" className="h-36 w-full object-cover" />
  </figure>
)

/** Overview header: tall vertical-farm photo with a dark scrim; `children` (glass cards) sit over the bottom of the photo. */
export function FarmHero({ title, description, actions, children }: { title: string; description?: ReactNode; actions?: ReactNode; children?: ReactNode }) {
  return (
    <header data-theme="dark" className="relative isolate flex min-h-[460px] flex-col justify-between gap-10 overflow-hidden rounded-card border border-line bg-card text-ink sm:min-h-[560px] xl:min-h-[700px]">
      <img src={HERO_PHOTO} alt="" decoding="async" fetchPriority="high" className="absolute inset-0 -z-20 size-full object-cover object-[50%_32%]" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-canvas via-canvas/55 to-transparent" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-2/3 bg-gradient-to-t from-black/45 to-transparent" />
      <div className="flex flex-wrap items-start justify-between gap-4 px-6 pt-10 sm:px-8 sm:pt-14">
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-3 max-w-xl text-[34px] font-normal uppercase leading-[1] tracking-tight sm:text-[60px]">{title}<SimTag /></h1>
          {description && <p className="mt-2 max-w-2xl text-sm text-ink/80 sm:text-base">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {/* The whole hero is pinned to the dark palette (data-theme above): the photo is always dark, so text and glass stay legible in light mode too. */}
      {children && <div className="px-4 pb-8 sm:px-6">{children}</div>}
      <p className="absolute bottom-2 right-4 text-[10px] text-white/50">Illustrative photo</p>
    </header>
  )
}
