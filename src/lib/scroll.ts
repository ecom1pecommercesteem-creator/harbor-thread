import Lenis from 'lenis'
import { useEffect } from 'react'

let lenis: Lenis | null = null

/** Smooth wheel/touch scrolling on the window. Skipped entirely for reduced-motion users (native scroll stays). */
export function useSmoothScroll() {
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    lenis = new Lenis({ autoRaf: true })
    return () => { lenis?.destroy(); lenis = null }
  }, [])
}

/** Modals set body overflow, which doesn't stop Lenis's programmatic scrolling, so pause it explicitly. */
export const setScrollLocked = (locked: boolean) => (locked ? lenis?.stop() : lenis?.start())

export const scrollToTop = () => (lenis ? lenis.scrollTo(0, { immediate: true }) : window.scrollTo(0, 0))
