import { Segmented } from '@/components/ui/Form'
import { useFarm } from '@/store'
import type { ThemePref } from '@/types'
import { SectionCard } from './FormSections'

const OPTIONS = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
] as const

/** Applied immediately (not part of the Save/Discard draft) so the preview is instant. */
export function AppearanceSection() {
  const theme = useFarm((s) => s.theme)
  const setTheme = useFarm((s) => s.setTheme)
  return (
    <SectionCard id="appearance" title="Appearance" subtitle="Choose a colour theme. Applied immediately and remembered in this browser. “System” follows your device setting.">
      <Segmented<ThemePref> label="Colour theme" value={theme} onChange={setTheme} options={OPTIONS} />
    </SectionCard>
  )
}
