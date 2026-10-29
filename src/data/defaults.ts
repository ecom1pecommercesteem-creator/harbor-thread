import type { Settings } from '@/types'

export const DEFAULT_SETTINGS: Settings = {
  facility: { name: 'Aurora Vertical Farm', city: 'Rotterdam, NL', contact: 'ops@aurora-demo.farm' },
  units: { temperature: 'C', volume: 'L', clock: '24h' },
  targets: {},
  thresholds: { criticalMarginPct: 50, reservoirLowPct: 30, reservoirCriticalPct: 15, maintenanceWarnDays: 7 },
  notifications: { critical: true, warning: true, info: false, toastOnNewAlert: true },
  display: { showSimBanner: true, defaultRange: '24h', simIntervalSec: 5 },
}
