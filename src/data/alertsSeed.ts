import { DAY, HOUR, iso } from '@/data/seed'
import { USER } from '@/lib/metrics'
import type { Alert } from '@/types'

/** Historical alerts (acknowledged / resolved) that give the Alerts page real history. Active alerts come from live rule evaluation. */
export function seedAlerts(now: number): Alert[] {
  const mk = (n: number, a: Omit<Alert, 'id' | 'read'>): Alert => ({ id: `al-seed-${n}`, read: true, ...a })
  return [
    mk(1, { facilityId: 'fac-aurora', severity: 'warning', title: 'Relative humidity above target in Zone A2', description: 'Relative humidity peaked at 74 %, above the Butterhead Lettuce target of 55–70 %. Recovered after HVAC defrost cycle.',
      assetKind: 'zone', assetId: 'z-a2', assetLabel: 'Zone A2', metric: 'humidity', value: 74, threshold: '55–70', unit: '%', createdAt: iso(now - 26 * HOUR), status: 'resolved', resolvedAt: iso(now - 24.5 * HOUR), resolvedBy: 'system' }),
    mk(2, { facilityId: 'fac-aurora', severity: 'critical', title: 'Irrigation Pump D critical fault', description: 'AF-300 reported overcurrent and stopped. Pump replaced after technician inspection.',
      assetKind: 'equipment', assetId: 'EQ-PMP-D', assetLabel: 'Irrigation Pump D', createdAt: iso(now - 3.2 * DAY), status: 'resolved', acknowledgedAt: iso(now - 3.2 * DAY + 12 * 60_000), acknowledgedBy: USER.name, resolvedAt: iso(now - 3.1 * DAY), resolvedBy: 'user' }),
    mk(3, { facilityId: 'fac-aurora', severity: 'warning', title: 'CO₂ below target in Zone D1', description: 'CO₂ fell to 640 ppm, below the Strawberry target of 700–1000 ppm (injection valve stuck).',
      assetKind: 'zone', assetId: 'z-d1', assetLabel: 'Zone D1', metric: 'co2', value: 640, threshold: '700–1000', unit: 'ppm', createdAt: iso(now - 2.1 * DAY), status: 'resolved', acknowledgedAt: iso(now - 2.1 * DAY + 20 * 60_000), acknowledgedBy: USER.name, resolvedAt: iso(now - 2.0 * DAY), resolvedBy: 'user' }),
    mk(4, { facilityId: 'fac-aurora', severity: 'warning', title: 'Sensor node offline in Zone A4', description: 'No heartbeat for 6 minutes. Node rejoined the mesh after a gateway handover.',
      assetKind: 'zone', assetId: 'z-a4', assetLabel: 'Zone A4', metric: 'sensor', createdAt: iso(now - 1.4 * DAY), status: 'resolved', resolvedAt: iso(now - 1.4 * DAY + 7 * 60_000), resolvedBy: 'system' }),
    mk(5, { facilityId: 'fac-aurora', severity: 'info', title: 'Gateway firmware 2.4.1 applied', description: 'Gateways 01 and 02 updated during the scheduled maintenance window.',
      assetKind: 'equipment', assetId: 'EQ-GW-01', assetLabel: 'Gateway 01', createdAt: iso(now - 4.5 * DAY), status: 'resolved', resolvedAt: iso(now - 4.5 * DAY + HOUR), resolvedBy: 'user' }),
    mk(6, { facilityId: 'fac-north', severity: 'warning', title: 'Temperature above target in Zone N3', description: 'Temperature reached 22.6 °C, above the Lacinato Kale target of 16–21 °C.',
      assetKind: 'zone', assetId: 'z-n3', assetLabel: 'Zone N3', metric: 'temperature', value: 22.6, threshold: '16–21', unit: '°C', createdAt: iso(now - 1.8 * DAY), status: 'resolved', resolvedAt: iso(now - 1.75 * DAY), resolvedBy: 'system' }),
    mk(7, { facilityId: 'fac-aurora', severity: 'critical', title: 'EC above target in Zone B1', description: 'EC reached 2.3 mS/cm, well above the Genovese Basil target of 1.0–1.6 mS/cm. Dosing pump was recalibrated.',
      assetKind: 'zone', assetId: 'z-b1', assetLabel: 'Zone B1', metric: 'ec', value: 2.3, threshold: '1.0–1.6', unit: 'mS/cm', createdAt: iso(now - 5.4 * DAY), status: 'resolved', acknowledgedAt: iso(now - 5.4 * DAY + 5 * 60_000), acknowledgedBy: USER.name, resolvedAt: iso(now - 5.3 * DAY), resolvedBy: 'user' }),
  ]
}
