const MIN_MS = 1400
const FADE_MS = 700
let hideAt = 0 // performance.now() timestamp at which the boot loader starts fading; 0 once there's nothing to wait for

/** ms until the boot loader starts fading. Intro animations (page, charts) wait this long so they don't play unseen underneath it. */
export const bootDelayMs = () => Math.max(0, hideAt - performance.now())

/** Fade out and remove the static loader from index.html. Call once, before the first render. */
export function hideBoot() {
  const el = document.getElementById('boot')
  if (!el) return
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  hideAt = reduced ? 0 : Math.max(MIN_MS, performance.now()) // performance.now() counts from navigation start, so slow loads don't wait extra
  setTimeout(() => {
    el.classList.add('boot-done')
    setTimeout(() => el.remove(), FADE_MS)
  }, bootDelayMs())
}
