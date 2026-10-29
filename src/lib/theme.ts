import { useEffect, useSyncExternalStore } from 'react'
import { useFarm } from '@/store'

export type ResolvedTheme = 'dark' | 'light'
const query = () => window.matchMedia('(prefers-color-scheme: light)')

function subscribe(cb: () => void) {
  const q = query()
  q.addEventListener('change', cb)
  return () => q.removeEventListener('change', cb)
}

/** Resolved theme ("system" follows the OS and updates live). Also applies it to <html data-theme>. */
export function useTheme(): { pref: ReturnType<typeof useFarm.getState>['theme']; resolved: ResolvedTheme; toggle: () => void } {
  const pref = useFarm((s) => s.theme)
  const setTheme = useFarm((s) => s.setTheme)
  const systemLight = useSyncExternalStore(subscribe, () => query().matches, () => false)
  const resolved: ResolvedTheme = pref === 'system' ? (systemLight ? 'light' : 'dark') : pref
  useEffect(() => {
    document.documentElement.dataset.theme = resolved
  }, [resolved])
  return { pref, resolved, toggle: () => setTheme(resolved === 'dark' ? 'light' : 'dark') }
}
