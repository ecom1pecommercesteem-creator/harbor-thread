import { Droplets, Lightbulb, Radio, Router, Wind, type LucideIcon } from 'lucide-react'
import { RESERVOIR_BY_ID, ZONE_BY_ID } from '@/data/seed'
import type { Equipment, EquipmentType, HealthStatus } from '@/types'

export const DAY = 86_400_000
/** Service is "due soon" when it falls within this many days (overdue counts as due soon). */
export const DUE_WINDOW_DAYS = 14

export const TYPE_META: Record<EquipmentType, { label: string; plural: string; icon: LucideIcon }> = {
  pump: { label: 'Pump', plural: 'Pumps', icon: Droplets },
  light: { label: 'LED light', plural: 'LED lights', icon: Lightbulb },
  hvac: { label: 'HVAC', plural: 'HVAC', icon: Wind },
  sensor: { label: 'Sensor', plural: 'Sensors', icon: Radio },
  gateway: { label: 'Gateway', plural: 'Gateways', icon: Router },
}
export const TYPE_ORDER: EquipmentType[] = ['pump', 'light', 'hvac', 'sensor', 'gateway']

export const STATUS_ORDER: HealthStatus[] = ['operational', 'warning', 'critical', 'offline']
export const STATUS_LABEL: Record<HealthStatus, string> = { operational: 'Operational', warning: 'Warning', critical: 'Critical', offline: 'Offline' }
/** Worst first, so ascending sort on status puts problems at the top. */
const STATUS_RANK: Record<HealthStatus, number> = { critical: 0, warning: 1, offline: 2, operational: 3 }

export interface Location {
  /** Stable filter key. */
  key: string
  label: string
  zoneId: string | null
  reservoirId: string | null
}

export function locationOf(eq: Equipment): Location {
  if (eq.zoneId) return { key: `zone:${eq.zoneId}`, label: `Zone ${ZONE_BY_ID.get(eq.zoneId)?.code ?? eq.zoneId}`, zoneId: eq.zoneId, reservoirId: null }
  if (eq.reservoirId) {
    const name = RESERVOIR_BY_ID.get(eq.reservoirId)?.name.split(' · ')[0] ?? eq.reservoirId
    return { key: `res:${eq.reservoirId}`, label: `${name} (pump)`, zoneId: null, reservoirId: eq.reservoirId }
  }
  if (eq.type === 'hvac') return { key: `hall:${eq.hall}`, label: `Hall ${eq.hall} (HVAC)`, zoneId: null, reservoirId: null }
  return { key: 'facility', label: 'Facility-wide (gateways)', zoneId: null, reservoirId: null }
}

export interface DueInfo {
  overdue: boolean
  soon: boolean
  label: string
}

export function dueInfo(iso: string, now: number): DueInfo {
  const diff = (Date.parse(iso) - now) / DAY
  if (diff < 0) {
    const n = Math.max(1, Math.floor(-diff))
    return { overdue: true, soon: true, label: `overdue by ${n} day${n === 1 ? '' : 's'}` }
  }
  const n = Math.ceil(diff)
  return { overdue: false, soon: diff <= DUE_WINDOW_DAYS, label: n === 0 ? 'due today' : `in ${n} day${n === 1 ? '' : 's'}` }
}

/** Faults from the last 14 days, newest first. */
export function recentFaults(eq: Equipment, now: number) {
  return eq.faults.filter((f) => now - Date.parse(f.at) <= 14 * DAY).sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
}

export type SortKey = 'name' | 'id' | 'type' | 'status' | 'lastSeen' | 'maintenanceDue'
export interface SortState {
  key: SortKey
  dir: 'asc' | 'desc'
}

function sortValue(e: Equipment, key: SortKey): string | number {
  switch (key) {
    case 'name': return e.name.toLowerCase()
    case 'id': return e.id
    case 'type': return TYPE_META[e.type].label
    case 'status': return STATUS_RANK[e.status]
    case 'lastSeen': return Date.parse(e.lastSeen)
    case 'maintenanceDue': return Date.parse(e.maintenanceDue)
  }
}

export function sortEquipment(list: Equipment[], sort: SortState): Equipment[] {
  const sign = sort.dir === 'asc' ? 1 : -1
  return [...list].sort((a, b) => {
    const va = sortValue(a, sort.key)
    const vb = sortValue(b, sort.key)
    return (va < vb ? -1 : va > vb ? 1 : 0) * sign
  })
}
