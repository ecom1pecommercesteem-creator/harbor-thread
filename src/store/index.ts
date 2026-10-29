import { addDays, format } from 'date-fns'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { seedAlerts } from '@/data/alertsSeed'
import { DEFAULT_SETTINGS } from '@/data/defaults'
import { maybeAppendBucket, seedIrrigation } from '@/data/history'
import { BATCHES, EQUIPMENT, FACILITIES, NOW, RESERVOIR_BY_ID, ZONES, ZONE_BY_ID, iso } from '@/data/seed'
import { USER } from '@/lib/metrics'
import { hashString } from '@/lib/rng'
import { initSim, stepSim } from '@/sim/engine'
import { evaluateRules, reconcile } from '@/sim/rules'
import type { Alert, Batch, Equipment, HealthStatus, IrrigationEvent, MaintenanceLog, ReservoirLive, Settings, ThemePref, Toast, ZoneLive } from '@/types'

export interface NewBatchInput {
  zoneId: string
  cropProfileId: string
  plantedAt: string // yyyy-MM-dd
  harvestEta: string // yyyy-MM-dd
  trays: number
  expectedYieldKg: number
  notes?: string
}

export interface MaintenanceInput {
  equipmentId: string
  note: string
  status?: HealthStatus
  /** Days until the next scheduled service. */
  nextDueDays?: number
}
 
interface FarmState {
  // Persisted user preferences / records
  facilityId: string
  sidebarCollapsed: boolean
  theme: ThemePref
  settings: Settings
  alerts: Alert[]
  suppressed: string[]
  userBatches: Batch[]
  equipmentPatch: Record<string, Partial<Equipment>>
  maintenanceLogs: MaintenanceLog[]
  demoIrrigation: IrrigationEvent[]
  // Session simulation state
  simPaused: boolean
  live: Record<string, ZoneLive>
  resLive: Record<string, ReservoirLive>
  equipment: Equipment[]
  batches: Batch[]
  irrigation: IrrigationEvent[]
  histVersion: number
  toasts: Toast[]

  setFacility: (id: string) => void
  toggleSidebar: () => void
  setTheme: (t: ThemePref) => void
  setSimPaused: (p: boolean) => void
  tick: () => void
  acknowledge: (id: string) => void
  resolve: (id: string) => void
  markRead: (id: string) => void
  markAllRead: () => void
  acknowledgeAll: () => void
  addBatch: (input: NewBatchInput) => Batch
  logMaintenance: (input: MaintenanceInput) => void
  runDemoIrrigation: (reservoirId: string, durationMin: number) => void
  setSettings: (s: Settings) => void
  resetSettings: () => void
  toast: (kind: Toast['kind'], message: string) => void
  dismissToast: (id: string) => void
}

const applyPatch = (list: Equipment[], patch: Record<string, Partial<Equipment>>) => list.map((e) => (patch[e.id] ? { ...e, ...patch[e.id] } : e))

/** Keep sensor + pump status consistent with the simulated live state. */
function syncEquipment(list: Equipment[], live: Record<string, ZoneLive>, now: number): Equipment[] {
  return list.map((e) => {
    if (e.type === 'sensor' && e.zoneId && live[e.zoneId]) {
      const l = live[e.zoneId]
      const status: HealthStatus = !l.sensorOnline ? 'offline' : e.status === 'offline' ? 'operational' : e.status
      return status === e.status && !l.sensorOnline ? e : { ...e, status, lastSeen: l.sensorOnline ? iso(l.updatedAt) : e.lastSeen }
    }
    if (e.status === 'offline') return e
    return { ...e, lastSeen: iso(now - (hashString(e.id) % 40) * 1000) }
  })
}

const sortAlerts = (a: Alert[]) => [...a].sort((x, y) => y.createdAt.localeCompare(x.createdAt))

export const useFarm = create<FarmState>()(
  persist(
    (set, get) => {
      /** Re-run rule evaluation against current state (after settings / equipment edits, and every tick). */
      const refresh = (patch: Partial<FarmState> = {}, backdate?: (key: string) => number) => {
        const s = { ...get(), ...patch }
        const candidates = evaluateRules({ zones: ZONES, live: s.live, resLive: s.resLive, equipment: s.equipment, batches: s.batches, settings: s.settings, now: Date.now() })
        const r = reconcile(s.alerts, candidates, s.suppressed, Date.now(), backdate ? (c) => backdate(c.ruleKey) : undefined)
        const fresh = r.created.filter((a) => s.settings.notifications[a.severity])
        const toasts = s.settings.notifications.toastOnNewAlert && backdate === undefined ? fresh.slice(0, 2).map((a): Toast => ({ id: `t-${a.id}`, kind: 'info', message: `New ${a.severity} alert: ${a.title}` })) : []
        set({ ...patch, alerts: sortAlerts(r.alerts).slice(0, 300), suppressed: r.suppressed, toasts: [...get().toasts, ...toasts].slice(-4) })
      }

      return {
        facilityId: FACILITIES[0].id,
        sidebarCollapsed: false,
        theme: 'dark',
        settings: DEFAULT_SETTINGS,
        alerts: [],
        suppressed: [],
        userBatches: [],
        equipmentPatch: {},
        maintenanceLogs: [],
        demoIrrigation: [],
        simPaused: false,
        live: {},
        resLive: {},
        equipment: EQUIPMENT,
        batches: BATCHES,
        irrigation: [],
        histVersion: 0,
        toasts: [],

        setFacility: (id) => set({ facilityId: id }),
        toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
        setTheme: (theme) => set({ theme }),
        setSimPaused: (p) => {
          set({ simPaused: p })
          get().toast('info', p ? 'Simulation paused — readings are frozen.' : 'Simulation resumed.')
        },

        tick: () => {
          const s = get()
          if (s.simPaused) return
          const now = Date.now()
          const r = stepSim({ live: s.live, resLive: s.resLive }, s.settings, now)
          const eqStatus = new Map(s.equipment.filter((e) => e.type === 'pump').map((e) => [e.reservoirId, e.status]))
          for (const [id, rl] of Object.entries(r.resLive)) if (eqStatus.get(id) === 'critical') rl.pump = 'fault'
          const hist = maybeAppendBucket(now, r.live, r.resLive)
          refresh({
            live: r.live,
            resLive: r.resLive,
            equipment: syncEquipment(s.equipment, r.live, now),
            irrigation: r.irrigation.length ? [...r.irrigation, ...s.irrigation].slice(0, 400) : s.irrigation,
            histVersion: hist ? s.histVersion + 1 : s.histVersion,
          })
        },

        acknowledge: (id) => {
          set((s) => ({ alerts: s.alerts.map((a) => (a.id === id && a.status === 'active' ? { ...a, status: 'acknowledged', acknowledgedAt: new Date().toISOString(), acknowledgedBy: USER.name, read: true } : a)) }))
          get().toast('success', 'Alert acknowledged.')
        },
        resolve: (id) => {
          const a = get().alerts.find((x) => x.id === id)
          if (!a) return
          set((s) => ({
            alerts: s.alerts.map((x) => (x.id === id ? { ...x, status: 'resolved', resolvedAt: new Date().toISOString(), resolvedBy: 'user', read: true } : x)),
            // If the condition is still present, keep it from instantly re-opening until it clears.
            suppressed: a.ruleKey ? [...new Set([...s.suppressed, a.ruleKey])] : s.suppressed,
          }))
          get().toast('success', 'Alert marked resolved.')
        },
        markRead: (id) => set((s) => ({ alerts: s.alerts.map((a) => (a.id === id && !a.read ? { ...a, read: true } : a)) })),
        markAllRead: () => set((s) => ({ alerts: s.alerts.map((a) => (a.facilityId === s.facilityId ? { ...a, read: true } : a)) })),
        acknowledgeAll: () => {
          let n = 0
          set((s) => ({
            alerts: s.alerts.map((a) => {
              if (a.facilityId !== s.facilityId || a.status !== 'active') return a
              n++
              return { ...a, status: 'acknowledged', acknowledgedAt: new Date().toISOString(), acknowledgedBy: USER.name, read: true }
            }),
          }))
          get().toast(n ? 'success' : 'info', n ? `${n} alert${n > 1 ? 's' : ''} acknowledged.` : 'No active alerts to acknowledge.')
        },

        addBatch: (input) => {
          const z = ZONE_BY_ID.get(input.zoneId)!
          const base = `B-${format(new Date(input.plantedAt), 'yyMMdd')}-${z.code}`
          const taken = new Set(get().batches.map((b) => b.id))
          let id = base
          for (let i = 1; taken.has(id); i++) id = `${base}-${String.fromCharCode(64 + i)}`
          const batch: Batch = {
            id, facilityId: z.facilityId, zoneId: z.id, cropProfileId: input.cropProfileId, plantedAt: new Date(input.plantedAt).toISOString(),
            harvestEta: new Date(input.harvestEta).toISOString(), trays: input.trays, expectedYieldKg: input.expectedYieldKg, notes: input.notes, userCreated: true,
          }
          set((s) => ({ userBatches: [batch, ...s.userBatches], batches: [batch, ...s.batches] }))
          get().toast('success', `Batch ${id} added (simulated).`)
          return batch
        },

        logMaintenance: ({ equipmentId, note, status, nextDueDays }) => {
          const s = get()
          const patch: Partial<Equipment> = {}
          if (status) patch.status = status
          if (nextDueDays !== undefined) patch.maintenanceDue = addDays(new Date(), nextDueDays).toISOString()
          const log: MaintenanceLog = { id: `ml-${Date.now().toString(36)}`, equipmentId, at: new Date().toISOString(), author: USER.name, note }
          const equipmentPatch = { ...s.equipmentPatch, [equipmentId]: { ...s.equipmentPatch[equipmentId], ...patch } }
          refresh({ maintenanceLogs: [log, ...s.maintenanceLogs], equipmentPatch, equipment: s.equipment.map((e) => (e.id === equipmentId ? { ...e, ...patch } : e)) })
          get().toast('success', 'Maintenance entry saved locally.')
        },

        runDemoIrrigation: (reservoirId, durationMin) => {
          const res = RESERVOIR_BY_ID.get(reservoirId)!
          const volumeL = Math.round(durationMin * 12)
          const ev: IrrigationEvent = { id: `irr-demo-${Date.now()}`, reservoirId, at: new Date().toISOString(), durationMin, volumeL, trigger: 'demo-manual' }
          set((s) => ({
            demoIrrigation: [ev, ...s.demoIrrigation].slice(0, 50),
            irrigation: [ev, ...s.irrigation],
            resLive: { ...s.resLive, [reservoirId]: { ...s.resLive[reservoirId], pump: 'running', levelPct: Math.max(0, +(s.resLive[reservoirId].levelPct - (volumeL / res.capacityL) * 100).toFixed(2)) } },
          }))
          get().toast('info', `Demo irrigation logged (${durationMin} min). No hardware was operated.`)
        },

        setSettings: (settings) => {
          refresh({ settings })
          get().toast('success', 'Settings saved.')
        },
        resetSettings: () => {
          refresh({ settings: DEFAULT_SETTINGS })
          get().toast('info', 'Settings reset to defaults.')
        },

        toast: (kind, message) => set((s) => ({ toasts: [...s.toasts, { id: `t-${Date.now()}-${s.toasts.length}`, kind, message }].slice(-4) })),
        dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      }
    },
    {
      name: 'verdantos-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        facilityId: s.facilityId, sidebarCollapsed: s.sidebarCollapsed, theme: s.theme, settings: s.settings, alerts: s.alerts, suppressed: s.suppressed,
        userBatches: s.userBatches, equipmentPatch: s.equipmentPatch, maintenanceLogs: s.maintenanceLogs, demoIrrigation: s.demoIrrigation,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<FarmState>
        return { ...current, ...p, settings: { ...DEFAULT_SETTINGS, ...p.settings, facility: { ...DEFAULT_SETTINGS.facility, ...p.settings?.facility }, units: { ...DEFAULT_SETTINGS.units, ...p.settings?.units }, thresholds: { ...DEFAULT_SETTINGS.thresholds, ...p.settings?.thresholds }, notifications: { ...DEFAULT_SETTINGS.notifications, ...p.settings?.notifications }, display: { ...DEFAULT_SETTINGS.display, ...p.settings?.display } } }
      },
    },
  ),
)

/** Build the initial simulated world from seeds + persisted user data. Runs once at startup. */
export function bootFarm(): void {
  const s = useFarm.getState()
  const sim = initSim(s.settings, NOW)
  const equipment = syncEquipment(applyPatch(EQUIPMENT, s.equipmentPatch), sim.live, NOW)
  const batches = [...s.userBatches, ...BATCHES]
  const irrigation = [...s.demoIrrigation, ...seedIrrigation()].sort((a, b) => b.at.localeCompare(a.at))
  const fresh = s.alerts.length === 0
  useFarm.setState({ live: sim.live, resLive: sim.resLive, equipment, batches, irrigation, alerts: fresh ? seedAlerts(NOW) : s.alerts })
  // First boot: backdate rule alerts so the feed looks lived-in (15–180 min), and pre-acknowledge the gateway warning.
  const useBackdate = fresh ? (key: string) => (15 + (hashString(key) % 165)) * 60_000 : undefined
  const st = useFarm.getState()
  const candidates = evaluateRules({ zones: ZONES, live: st.live, resLive: st.resLive, equipment: st.equipment, batches: st.batches, settings: st.settings, now: Date.now() })
  const r = reconcile(st.alerts, candidates, st.suppressed, Date.now(), useBackdate ? (c) => useBackdate(c.ruleKey) : undefined)
  const alerts = r.alerts.map((a) =>
    fresh && a.ruleKey === 'EQ-GW-02:status' ? { ...a, status: 'acknowledged' as const, acknowledgedAt: new Date(new Date(a.createdAt).getTime() + 9 * 60_000).toISOString(), acknowledgedBy: USER.name, read: true } : a,
  )
  useFarm.setState({ alerts: sortAlerts(alerts), suppressed: r.suppressed })
}
bootFarm()
