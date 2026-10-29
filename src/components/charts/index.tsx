import { format } from 'date-fns'
import { useEffect, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { bootDelayMs } from '@/lib/boot'
import { cx } from '@/lib/format'
import type { SeriesPoint, TimeRange } from '@/types'

/** Theme-aware: resolved from CSS variables so charts follow light/dark mode. */
export const CHART_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)'] as const
const AXIS = { fontSize: 11, fill: 'var(--color-mute)' }
const GRID = 'var(--color-line)'

const INTRO_MS = 900
/** Animate once on mount (page load / navigation), then switch off so the 5 s live updates don't re-animate. Off for reduced motion. On first load it waits for the boot loader to fade. */
function useIntroAnimation() {
  const [begin] = useState(bootDelayMs)
  const [on, setOn] = useState(() => !matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    if (!on) return
    const t = setTimeout(() => setOn(false), begin + INTRO_MS + 200)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return { isAnimationActive: on, animationBegin: begin, animationDuration: INTRO_MS, animationEasing: 'ease-out' } as const
}

export interface ChartSeries {
  key: string
  label: string
  color?: string
  /** Unit shown in tooltip. */
  unit?: string
  decimals?: number
}

const tickFormat = (range: TimeRange | 'day') => (t: number) => format(t, range === '24h' ? 'HH:mm' : range === '7d' ? 'EEE d' : 'd MMM')

interface TipProps {
  active?: boolean
  payload?: { dataKey: string; value: number; color?: string; stroke?: string; fill?: string }[]
  label?: number | string
  series: ChartSeries[]
  range: TimeRange | 'day' | 'category'
}
function Tip({ active, payload, label, series, range }: TipProps) {
  if (!active || !payload?.length) return null
  const title = typeof label === 'number' ? format(label, range === '24h' ? 'd MMM, HH:mm' : range === '7d' ? 'EEE d MMM, HH:mm' : 'EEE d MMM yyyy') : String(label)
  return (
    <div className="rounded-xl border border-line bg-card-2 px-3 py-2.5 text-xs shadow-xl">
      <div className="mb-1.5 text-mute">{title}</div>
      {payload.map((p) => {
        const s = series.find((x) => x.key === p.dataKey)
        if (!s || p.value === undefined || Number.isNaN(p.value)) return null
        return (
          <div key={p.dataKey} className="flex items-center justify-between gap-6 py-0.5">
            <span className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: s.color ?? p.stroke ?? p.fill }} />{s.label}</span>
            <span className="tabular-nums text-ink">{p.value.toLocaleString(undefined, { maximumFractionDigits: s.decimals ?? 1 })}{s.unit ? ` ${s.unit}` : ''}</span>
          </div>
        )
      })}
    </div>
  )
}

const colorOf = (s: ChartSeries, i: number) => s.color ?? CHART_COLORS[i % CHART_COLORS.length]

interface TimeProps {
  data: SeriesPoint[]
  series: ChartSeries[]
  range: TimeRange
  height?: number
  /** Target band drawn behind the lines (single-metric charts). */
  band?: { min: number; max: number } | null
  yDomain?: [number | 'auto' | 'dataMin' | 'dataMax', number | 'auto' | 'dataMin' | 'dataMax']
  area?: boolean
  yFormat?: (v: number) => string
  className?: string
  /** Accessible summary for screen readers. */
  label: string
}

/** Line/area time-series chart with optional target band. Resizes with its container. */
export function TimeSeriesChart({ data, series, range, height = 240, band, yDomain, area, yFormat, className, label }: TimeProps) {
  const Chart = area ? AreaChart : LineChart
  const anim = useIntroAnimation()
  return (
    <div className={cx('w-full', className)} style={{ height }} role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <Chart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <defs>
            {series.map((s, i) => (
              <linearGradient key={s.key} id={`g-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colorOf(s, i)} stopOpacity={0.28} />
                <stop offset="100%" stopColor={colorOf(s, i)} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={tickFormat(range)} tick={AXIS} axisLine={false} tickLine={false} minTickGap={36} />
          <YAxis tick={AXIS} axisLine={false} tickLine={false} width={48} domain={yDomain ?? ['auto', 'auto']} tickFormatter={yFormat ?? ((v: number) => String(Math.round(v * 100) / 100))} />
          {band && <ReferenceArea y1={band.min} y2={band.max} fill="var(--chart-1)" fillOpacity={0.09} stroke="var(--chart-1)" strokeOpacity={0.25} strokeDasharray="4 4" ifOverflow="extendDomain" />}
          <Tooltip content={<Tip series={series} range={range} />} cursor={{ stroke: 'var(--color-dim)', strokeDasharray: '3 3' }} />
          {series.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: 'var(--color-mute)', paddingTop: 8 }} />}
          {series.map((s, i) =>
            area ? (
              <Area key={s.key} dataKey={s.key} name={s.label} type="monotone" stroke={colorOf(s, i)} strokeWidth={2} fill={`url(#g-${s.key})`} dot={false} activeDot={{ r: 4 }} {...anim} connectNulls />
            ) : (
              <Line key={s.key} dataKey={s.key} name={s.label} type="monotone" stroke={colorOf(s, i)} strokeWidth={2} dot={false} activeDot={{ r: 4 }} {...anim} connectNulls />
            ),
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  )
}

interface BarProps {
  data: Record<string, string | number>[]
  xKey: string
  series: ChartSeries[]
  height?: number
  stacked?: boolean
  /** 'time' formats numeric epoch xKey; 'category' prints x as-is. */
  xKind?: 'time' | 'category'
  range?: TimeRange | 'day'
  layout?: 'vertical' | 'horizontal'
  className?: string
  label: string
  yFormat?: (v: number) => string
}

/** Bar chart (vertical bars by default; layout="vertical" gives horizontal bars). */
export function BarSeriesChart({ data, xKey, series, height = 240, stacked, xKind = 'category', range = 'day', layout = 'horizontal', className, label, yFormat }: BarProps) {
  const horizontalBars = layout === 'vertical'
  const anim = useIntroAnimation()
  return (
    <div className={cx('w-full', className)} style={{ height }} role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={data} layout={layout} margin={{ top: 8, right: 8, bottom: 0, left: horizontalBars ? 8 : -8 }} barCategoryGap="22%">
          <CartesianGrid stroke={GRID} vertical={horizontalBars} horizontal={!horizontalBars} />
          {horizontalBars ? (
            <>
              <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} tickFormatter={yFormat} />
              <YAxis type="category" dataKey={xKey} tick={AXIS} axisLine={false} tickLine={false} width={72} />
            </>
          ) : (
            <>
              <XAxis dataKey={xKey} tick={AXIS} axisLine={false} tickLine={false} minTickGap={16} tickFormatter={xKind === 'time' ? (tickFormat(range) as (v: unknown) => string) : undefined} />
              <YAxis tick={AXIS} axisLine={false} tickLine={false} width={48} tickFormatter={yFormat} />
            </>
          )}
          <Tooltip content={<Tip series={series} range={xKind === 'time' ? range : 'category'} />} cursor={{ fill: 'var(--color-chip)', fillOpacity: 0.5 }} />
          {series.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: 'var(--color-mute)', paddingTop: 8 }} />}
          {series.map((s, i) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={colorOf(s, i)} radius={stacked ? 0 : horizontalBars ? [0, 6, 6, 0] : [6, 6, 0, 0]} stackId={stacked ? 'a' : undefined} {...anim} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
