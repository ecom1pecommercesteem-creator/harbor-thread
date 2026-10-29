import { useMemo } from 'react'
import { FACILITIES, RESERVOIRS, ZONES } from '@/data/seed'
import { zoneHealth } from '@/sim/rules'
import { useFarm } from '@/store'
import type { HealthStatus } from '@/types'

export const useFacility = () => {
  const id = useFarm((s) => s.facilityId)
  return FACILITIES.find((f) => f.id === id) ?? FACILITIES[0]
}
export const useZones = () => {
  const id = useFarm((s) => s.facilityId)
  return useMemo(() => ZONES.filter((z) => z.facilityId === id), [id])
}
export const useReservoirs = () => {
  const id = useFarm((s) => s.facilityId)
  return useMemo(() => RESERVOIRS.filter((r) => r.facilityId === id), [id])
}
export const useFacilityEquipment = () => {
  const id = useFarm((s) => s.facilityId)
  const eq = useFarm((s) => s.equipment)
  return useMemo(() => eq.filter((e) => e.facilityId === id), [eq, id])
}
export const useFacilityBatches = () => {
  const id = useFarm((s) => s.facilityId)
  const b = useFarm((s) => s.batches)
  return useMemo(() => b.filter((x) => x.facilityId === id), [b, id])
}
export const useFacilityAlerts = () => {
  const id = useFarm((s) => s.facilityId)
  const a = useFarm((s) => s.alerts)
  return useMemo(() => a.filter((x) => x.facilityId === id), [a, id])
}
/** Unread = not yet seen/acknowledged and not resolved. */
export const useUnreadCount = () => {
  const a = useFacilityAlerts()
  return useMemo(() => a.filter((x) => !x.read && x.status !== 'resolved').length, [a])
}
/** zoneId → health, for all zones in the selected facility. */
export const useZoneHealthMap = () => {
  const zones = useZones()
  const live = useFarm((s) => s.live)
  const settings = useFarm((s) => s.settings)
  return useMemo(() => Object.fromEntries(zones.map((z) => [z.id, zoneHealth(z, live[z.id], settings)])) as Record<string, HealthStatus>, [zones, live, settings])
}
