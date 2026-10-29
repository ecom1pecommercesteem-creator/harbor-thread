import fruiting from '@/assets/photos/fruiting.webp'
import hero from '@/assets/photos/hero.webp'
import herbs from '@/assets/photos/herbs.webp'
import leafy from '@/assets/photos/leafy.webp'
import microgreens from '@/assets/photos/microgreens.webp'
import type { CropProfile } from '@/types'

/** Local stock photos (Unsplash License). Illustrative only — not images of this simulated farm. See README for sources. */
export const HERO_PHOTO = hero
export const CROP_PHOTO: Record<CropProfile['category'], string> = {
  'Leafy greens': leafy,
  Herbs: herbs,
  Microgreens: microgreens,
  Fruiting: fruiting,
}
