import type { Metric } from '@/types'

/** Scripted "meaningful events" present at boot so every page tells the same story. Offset is in units of the crop's target-range width. */
export interface Scenario {
  zoneCode: string
  metric: Metric
  offsetWidths: number
  /** Remaining sim ticks the pull lasts at boot. */
  ticks: number
}

export const BOOT_SCENARIOS: Scenario[] = [
  // Zone B4 humidity high — matches the HVAC Hall B dehumidifier fault in the equipment seed.
  { zoneCode: 'B4', metric: 'humidity', offsetWidths: 0.9, ticks: 700 },
  // Zone D2 running warm.
  { zoneCode: 'D2', metric: 'temperature', offsetWidths: 0.95, ticks: 500 },
  // Zone C2 pH drifting high (critical-level excursion).
  { zoneCode: 'C2', metric: 'ph', offsetWidths: 0.9, ticks: 400 },
]

/** Initial reservoir levels (%). Reservoir C starts below the low-level threshold. */
export const BOOT_RESERVOIR_LEVEL: Record<string, number> = {
  'res-a': 82, 'res-b': 64, 'res-c': 26, 'res-d': 55, 'res-n1': 71, 'res-n2': 49,
}
