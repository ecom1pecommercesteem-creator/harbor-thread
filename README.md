# VerdantOS — Vertical Farm Control Center (demo)

Frontend-only operations dashboard for a **simulated** indoor vertical farm. No backend, auth, or hardware: every reading is generated locally and labelled as simulated.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc -b && vite build
```

Stack: React 19, Vite, strict TypeScript, Tailwind v4, React Router, Recharts, Motion, date-fns, Zustand, Lucide.
Visual direction adapted from the Orion Behance reference (near-black canvas, charcoal cards, lime accent, pill chips) with forest-tinted blacks.

## Layout
- `src/data` — typed seed data (2 facilities, 20 zones, 8 crops, equipment, batches) and deterministic 30–90 day history
- `src/sim` — simulation engine (mean-reverting readings, events, sensor dropouts) and alert rules
- `src/store` — Zustand store; settings, alert states, user batches and maintenance logs persist in `localStorage` (`verdantos-v1`)
- `src/components/{ui,charts,layout,domain}` and `src/pages` — UI kit, shell, and the nine pages

## Notes
- Crop target ranges are illustrative demo values, editable in Settings; changing them or the alert thresholds re-evaluates alerts immediately.
- Detail drawers are URL-driven: `/zones?zone=z-b4`, `/crops?batch=…`, `/equipment?eq=EQ-HVC-B`, `/alerts?alert=…`. `Ctrl/⌘+K` opens quick navigation.
- "Reset demo data" (profile menu) clears the saved state.

## Photos
Stock photos in `src/assets/photos` are from [Unsplash](https://unsplash.com) (free under the [Unsplash License](https://unsplash.com/license); attribution not required). They are illustrative, not pictures of the simulated farm:
[hero](https://unsplash.com/photos/ejkxSI1rd48) · [leafy greens](https://unsplash.com/photos/tUxlImHIZnA) · [herbs](https://unsplash.com/photos/fOQev_6sX6g) · [fruiting](https://unsplash.com/photos/_NL8CRGOohM) · [microgreens](https://unsplash.com/photos/7OX1PGXzfqg)
# harbor-thread
