/** Core domain model. All data in VerdantOS is SIMULATED. IDs are stable strings. */

export type Metric = 'temperature' | 'humidity' | 'co2' | 'ppfd' | 'ph' | 'ec'
export type HealthStatus = 'operational' | 'warning' | 'critical' | 'offline'
export type Severity = 'critical' | 'warning' | 'info'
export type AlertStatus = 'active' | 'acknowledged' | 'resolved'

export interface Range {
  min: number
  max: number
}

export interface Facility {
  id: string
  name: string
  city: string
  areaM2: number
  timezone: string
}

/** Crop-specific target ranges (illustrative demonstration values). */
export interface CropProfile {
  id: string
  name: string
  variety: string
  category: 'Leafy greens' | 'Herbs' | 'Microgreens' | 'Fruiting'
  cycleDays: number
  /** Illustrative kg harvested per m² of grow area per cycle. */
  yieldKgPerM2: number
  targets: Record<Metric, Range>
}

export interface Zone {
  id: string
  code: string // e.g. "B4"
  name: string
  facilityId: string
  cropProfileId: string | null
  racks: number
  shelvesPerRack: number
  areaM2: number
  reservoirId: string
  /** Lights-on photoperiod, local hours. */
  lightsOn: [number, number]
}

export interface Reservoir {
  id: string
  name: string
  facilityId: string
  capacityL: number
  zoneIds: string[]
}

export type BatchStage = 'Germination' | 'Seedling' | 'Vegetative' | 'Maturation' | 'Ready to harvest' | 'Harvested'
export type BatchStatus = 'healthy' | 'attention' | 'at-risk' | 'harvested'

export interface Batch {
  id: string // e.g. "B-2410-B4"
  facilityId: string
  zoneId: string
  cropProfileId: string
  plantedAt: string // ISO
  harvestEta: string // ISO
  trays: number
  expectedYieldKg: number
  actualYieldKg?: number
  lossKg?: number
  harvestedAt?: string
  notes?: string
  userCreated?: boolean
}

export type EquipmentType = 'pump' | 'light' | 'hvac' | 'sensor' | 'gateway'

export interface Fault {
  id: string
  at: string
  code: string
  message: string
}

export interface StatusEvent {
  at: string
  status: HealthStatus
  note: string
}

export interface MaintenanceLog {
  id: string
  equipmentId: string
  at: string
  author: string
  note: string
}

export interface Equipment {
  id: string // e.g. "EQ-PMP-01"
  name: string
  type: EquipmentType
  facilityId: string
  zoneId: string | null
  reservoirId?: string | null
  /** Hall letter (A–D, N) for hall-level equipment such as HVAC. */
  hall: string
  model: string
  status: HealthStatus
  lastSeen: string // ISO
  maintenanceDue: string // ISO
  faults: Fault[]
}

/** Latest reading for a zone. When sensorOnline is false the values are STALE (frozen at updatedAt). */
export interface ZoneLive {
  zoneId: string
  temperature: number
  humidity: number
  co2: number
  ppfd: number
  ph: number
  ec: number
  sensorOnline: boolean
  updatedAt: number // epoch ms of last fresh measurement
  lightsOn: boolean
}

export type PumpState = 'running' | 'idle' | 'fault'

export interface ReservoirLive {
  reservoirId: string
  levelPct: number
  ph: number
  ec: number
  waterTemp: number
  pump: PumpState
  updatedAt: number
}

export interface IrrigationEvent {
  id: string
  reservoirId: string
  at: string
  durationMin: number
  volumeL: number
  trigger: 'schedule' | 'demo-manual' | 'auto-refill'
}

export interface Alert {
  id: string
  facilityId: string
  severity: Severity
  title: string
  description: string
  assetKind: 'zone' | 'equipment' | 'reservoir'
  assetId: string
  assetLabel: string
  metric?: Metric | 'level' | 'sensor' | 'maintenance'
  value?: number
  threshold?: string
  unit?: string
  createdAt: string
  status: AlertStatus
  acknowledgedAt?: string
  acknowledgedBy?: string
  resolvedAt?: string
  resolvedBy?: 'user' | 'system'
  read: boolean
  /** Dedup key for rule-generated alerts: `${assetId}:${metric}:${low|high}`. */
  ruleKey?: string
}

/** One point of aggregated history. t = epoch ms. */
export interface SeriesPoint {
  t: number
  [key: string]: number
}

export type TimeRange = '24h' | '7d' | '30d'

export interface Settings {
  facility: { name: string; city: string; contact: string }
  units: { temperature: 'C' | 'F'; volume: 'L' | 'gal'; clock: '24h' | '12h' }
  /** Per-crop target overrides (cropProfileId → metric → range). Falls back to the crop profile defaults. */
  targets: Record<string, Partial<Record<Metric, Range>>>
  thresholds: {
    /** Percent beyond the target range edge at which a warning becomes critical. */
    criticalMarginPct: number
    reservoirLowPct: number
    reservoirCriticalPct: number
    maintenanceWarnDays: number
  }
  notifications: { critical: boolean; warning: boolean; info: boolean; toastOnNewAlert: boolean }
  display: { showSimBanner: boolean; defaultRange: TimeRange; simIntervalSec: number }
}

export interface Toast {
  id: string
  kind: 'success' | 'error' | 'info'
  message: string
}

export type ThemePref = 'dark' | 'light' | 'system'
