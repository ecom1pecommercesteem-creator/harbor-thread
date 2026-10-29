import { format, formatDistanceToNowStrict } from 'date-fns'
import { useFarm } from '@/store'

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ')
export const toDate = (d: string | number | Date) => (d instanceof Date ? d : new Date(d))

/** Unit-aware formatters. Call inside components: `const f = useFmt()`. */
export function useFmt() {
  const { temperature, volume, clock } = useFarm((s) => s.settings.units)
  const tf = clock === '24h' ? 'HH:mm' : 'h:mm a'
  return {
    tempUnit: temperature === 'C' ? '°C' : '°F',
    volUnit: volume === 'L' ? 'L' : 'gal',
    /** Convert a °C value for display (no unit). */
    tempVal: (c: number) => (temperature === 'C' ? c : c * 1.8 + 32),
    temp: (c: number, d = 1) => `${(temperature === 'C' ? c : c * 1.8 + 32).toFixed(d)} ${temperature === 'C' ? '°C' : '°F'}`,
    volVal: (l: number) => (volume === 'L' ? l : l * 0.264172),
    vol: (l: number, d = 0) => `${(volume === 'L' ? l : l * 0.264172).toLocaleString(undefined, { maximumFractionDigits: d })} ${volume === 'L' ? 'L' : 'gal'}`,
    time: (d: string | number | Date) => format(toDate(d), tf),
    dateTime: (d: string | number | Date) => format(toDate(d), `d MMM, ${tf}`),
    date: (d: string | number | Date) => format(toDate(d), 'd MMM yyyy'),
    shortDate: (d: string | number | Date) => format(toDate(d), 'd MMM'),
    ago: (d: string | number | Date) => `${formatDistanceToNowStrict(toDate(d))} ago`,
    until: (d: string | number | Date) => formatDistanceToNowStrict(toDate(d), { addSuffix: true }),
  }
}
export type Fmt = ReturnType<typeof useFmt>

export const num = (v: number, d = 0) => v.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })

export function downloadCsv(filename: string, rows: Record<string, string | number>[]): void {
  if (!rows.length) return
  const cols = Object.keys(rows[0])
  const esc = (v: string | number) => {
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
