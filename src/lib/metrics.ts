import type { Metric } from '@/types'

export const METRIC_META: Record<Metric, { label: string; short: string; unit: string; decimals: number }> = {
  temperature: { label: 'Temperature', short: 'Temp', unit: '°C', decimals: 1 },
  humidity: { label: 'Relative humidity', short: 'RH', unit: '%', decimals: 0 },
  co2: { label: 'CO₂', short: 'CO₂', unit: 'ppm', decimals: 0 },
  ppfd: { label: 'Light intensity', short: 'PPFD', unit: 'µmol/m²/s', decimals: 0 },
  ph: { label: 'pH', short: 'pH', unit: '', decimals: 2 },
  ec: { label: 'EC', short: 'EC', unit: 'mS/cm', decimals: 2 },
}
export const METRICS = Object.keys(METRIC_META) as Metric[]

export const USER = { name: 'Maya Chen', role: 'Farm Manager', initials: 'MC' }
