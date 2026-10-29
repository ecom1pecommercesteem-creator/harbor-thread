import { FlaskConical } from 'lucide-react'
import { motion, MotionConfig } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Toaster } from '@/components/ui/Toaster'
import { bootDelayMs } from '@/lib/boot'
import { scrollToTop, useSmoothScroll } from '@/lib/scroll'
import { useTheme } from '@/lib/theme'
import { useFarm } from '@/store'
import { CommandPalette } from './CommandPalette'
import { MobileNav, Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

/** Drives the simulation on a configurable interval; timer is cleaned up on unmount / interval change. */
function useSimulation() {
  const sec = useFarm((s) => s.settings.display.simIntervalSec)
  useEffect(() => {
    const id = setInterval(() => useFarm.getState().tick(), sec * 1000)
    return () => clearInterval(id)
  }, [sec])
}

export function Shell() {
  useSimulation()
  useTheme()
  useSmoothScroll()
  const [nav, setNav] = useState(false)
  const [palette, setPalette] = useState(false)
  const showBanner = useFarm((s) => s.settings.display.showSimBanner)
  const { pathname } = useLocation()
  const closeNav = useCallback(() => setNav(false), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p) }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])
  useEffect(() => { document.getElementById('main')?.scrollTo?.(0, 0); scrollToTop() }, [pathname])

  return (
    <div className="flex min-h-dvh">
      <a href="#main" className="sr-only z-[70] rounded-full bg-lime px-4 py-2 text-lime-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
      <Sidebar />
      <MobileNav open={nav} onClose={closeNav} />
      <div className="flex min-w-0 flex-1 flex-col">
        {showBanner && (
          <div role="note" className="flex items-center justify-center gap-2 bg-lime px-4 py-1.5 text-center text-[12px] font-medium text-lime-ink">
            <FlaskConical aria-hidden className="size-3.5 shrink-0" />
            <span><strong className="tracking-wider">SIMULATED DATA</strong> — demo environment. No real sensors or hardware are connected.</span>
          </div>
        )}
        <TopBar onMenu={() => setNav(true)} onSearch={() => setPalette(true)} />
        <main id="main" tabIndex={-1} className="w-full flex-1 px-4 pb-16 pt-6 outline-none sm:px-6 lg:px-8">
          {/* Re-keyed per route so every page fades/rises in. reducedMotion="user" drops the movement for users who opt out. */}
          <MotionConfig reducedMotion="user">
            <motion.div key={pathname} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: bootDelayMs() / 1000, ease: [0.22, 1, 0.36, 1] }}><Outlet /></motion.div>
          </MotionConfig>
        </main>
      </div>
      <CommandPalette open={palette} onClose={() => setPalette(false)} />
      <Toaster />
    </div>
  )
}
