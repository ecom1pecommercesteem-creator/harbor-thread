import { useMemo } from 'react'
import { CROP_BY_ID, RESERVOIR_BY_ID } from '@/data/seed'
import type { Fmt } from '@/lib/format'
import { METRIC_META } from '@/lib/metrics'
import { useFarm } from '@/store'
import { useZoneHealthMap, useZones } from '@/store/hooks'
import { effectiveTargets, fmtRange, zoneBreaches, type Breach } from '@/sim/rules'
import type { CropProfile, HealthStatus, Metric, PumpState, Range, ReservoirLive, Zone, ZoneLive } from '@/types'

/** Filter value used for idle zones (no crop assigned). */
export const IDLE_CROP = '__idle__'
export const METRIC_ORDER: Metric[] = ['temperature', 'humidity', 'co2', 'ppfd', 'ph', 'ec']

export const HEALTH_FILTERS = [
  { value: 'all', label: 'All health' },
  { value: 'operational', label: 'Operational' },
  { value: 'warning', label: 'Warning' },
  { value: 'critical', label: 'Critical' },
  { value: 'offline', label: 'Offline / idle' },
] as const
export type HealthFilter = (typeof HEALTH_FILTERS)[number]['value']

export const PUMP_LABEL: Record<PumpState, string> = { running: 'Pump running', idle: 'Pump idle', fault: 'Pump fault' }

export interface ZoneView {
  zone: Zone
  crop: CropProfile | undefined
  /** Effective (Settings-aware) targets. Undefined for idle zones. */
  targets: Record<Metric, Range> | undefined
  live: ZoneLive | undefined
  health: HealthStatus
  /** Breaches from zoneBreaches(): the same source the Alerts page uses. */
  breaches: Breach[]
  stale: boolean
  reservoirName: string
  res: ReservoirLive | undefined
  searchText: string
}

/** All zones of the selected facility, joined with live data, health and breaches. */
export function useZoneViews(): ZoneView[] {
  const zones = useZones()
  const live = useFarm((s) => s.live)
  const resLive = useFarm((s) => s.resLive)
  const settings = useFarm((s) => s.settings)
  const health = useZoneHealthMap()
  return useMemo(
    () =>
      zones.map((zone) => {
        const crop = zone.cropProfileId ? CROP_BY_ID.get(zone.cropProfileId) : undefined
        const l = live[zone.id]
        return {
          zone,
          crop,
          targets: zone.cropProfileId ? effectiveTargets(zone.cropProfileId, settings) : undefined,
          live: l,
          health: health[zone.id] ?? 'offline',
          breaches: zoneBreaches(zone, l, settings),
          stale: !!l && !l.sensorOnline,
          reservoirName: RESERVOIR_BY_ID.get(zone.reservoirId)?.name ?? zone.reservoirId,
          res: resLive[zone.reservoirId],
          searchText: [zone.code, zone.name, crop?.name, crop?.variety].filter(Boolean).join(' ').toLowerCase(),
        }
      }),
    [zones, live, resLive, settings, health],
  )
}

export const breachFor = (v: ZoneView, m: Metric): Breach | undefined => v.breaches.find((b) => b.metric === m)

/** Value + unit for display, honouring the Settings temperature unit. */
export function metricDisplay(m: Metric, value: number, fmt: Fmt): { value: string; unit: string } {
  if (m === 'temperature') return { value: fmt.tempVal(value).toFixed(1), unit: fmt.tempUnit }
  const meta = METRIC_META[m]
  return { value: value.toFixed(meta.decimals), unit: meta.unit }
}

export function rangeDisplay(m: Metric, r: Range, fmt: Fmt): string {
  if (m === 'temperature') return fmtRange({ min: fmt.tempVal(r.min), max: fmt.tempVal(r.max) }, fmt.tempUnit, 1)
  const meta = METRIC_META[m]
  return fmtRange(r, meta.unit, meta.decimals)
}

export const hourLabel = (h: number) => `${String(h).padStart(2, '0')}:00`
