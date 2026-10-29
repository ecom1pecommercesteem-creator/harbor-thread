import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState, TableCard, td, th, tr } from '@/components/ui/Display'
import { num } from '@/lib/format'
import { useFarm } from '@/store'
import type { AnalyticsModel, LossRow } from './model'

const fmtOr = (v: number | null, d: number) => (v === null ? '—' : num(v, d))

export function LossTable({ rows }: { rows: LossRow[] }) {
  return (
    <Card>
      <CardHeader title="Loss by crop" subtitle="Loss as a share of gross output (actual harvest + loss)." />
      <div className="px-3 pb-5 pt-4">
        {rows.length === 0 ? (
          <EmptyState title="No harvests in this range" message="Loss figures appear once batches are harvested." />
        ) : (
          <TableCard>
            <table className="w-full">
              <caption className="sr-only">Loss by crop for the selected range</caption>
              <thead>
                <tr>
                  <th scope="col" className={th}>Crop</th>
                  <th scope="col" className={th}>Batches</th>
                  <th scope="col" className={th}>Harvested (kg)</th>
                  <th scope="col" className={th}>Loss (kg)</th>
                  <th scope="col" className={th}>Loss %</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.crop} className={tr}>
                    <th scope="row" className={`${td} text-left font-normal`}>{r.crop}</th>
                    <td className={td}>{r.batches}</td>
                    <td className={td}>{num(r.actualKg, 1)}</td>
                    <td className={td}>{num(r.lossKg, 1)}</td>
                    <td className={td}>{fmtOr(r.lossPct, 1)}{r.lossPct === null ? '' : '%'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>
        )}
      </div>
    </Card>
  )
}

export function ResourceTable({ m }: { m: AnalyticsModel }) {
  const live = useFarm((s) => s.live)
  const med = m.medianEnergyPerKg
  return (
    <Card>
      <CardHeader
        title="Resource use per zone"
        subtitle={
          med === null
            ? 'No zone harvested in this range, so no per-kg median is available.'
            : `Energy per kg is compared with the median zone that harvested in this range (${num(med, 2)} kWh/kg). Descriptive only, not a target.`
        }
      />
      <div className="px-3 pb-5 pt-4">
        {m.resources.length === 0 ? (
          <EmptyState title="No zones" message="This facility has no zones to compare." />
        ) : (
          <TableCard>
            <table className="w-full min-w-[820px]">
              <caption className="sr-only">Energy and water use per zone with efficiency per kg harvested</caption>
              <thead>
                <tr>
                  <th scope="col" className={th}>Zone</th>
                  <th scope="col" className={th}>Status</th>
                  <th scope="col" className={th}>Energy (kWh)</th>
                  <th scope="col" className={th}>Water ({m.volUnit})</th>
                  <th scope="col" className={th}>Harvested (kg)</th>
                  <th scope="col" className={th}>Energy / kg</th>
                  <th scope="col" className={th}>Water / kg</th>
                  <th scope="col" className={th}>Energy / kg vs median</th>
                </tr>
              </thead>
              <tbody>
                {m.resources.map((r) => {
                  const offline = live[r.zone.id]?.sensorOnline === false
                  const vs = r.vsMedianPct
                  return (
                    <tr key={r.zone.id} className={tr}>
                      <th scope="row" className={`${td} text-left font-normal`}>
                        <Link to={`/zones?zone=${r.zone.id}`} className="text-lime hover:underline">{r.zone.code} · {r.zone.name}</Link>
                      </th>
                      <td className={td}>
                        <div className="flex flex-wrap gap-1.5">
                          {r.zone.cropProfileId === null ? <Badge>Idle</Badge> : null}
                          {offline ? <Badge tone="warn">Stale sensor</Badge> : null}
                        </div>
                      </td>
                      <td className={td}>{num(r.energyKwh, 1)}</td>
                      <td className={td}>{num(r.waterVol, 0)}</td>
                      <td className={td}>{r.actualKg > 0 ? num(r.actualKg, 1) : '—'}</td>
                      <td className={td}>{fmtOr(r.energyPerKg, 2)}</td>
                      <td className={td}>{fmtOr(r.waterPerKg, 2)}</td>
                      <td className={td}>{vs === null ? '—' : `${vs > 0 ? '+' : ''}${num(Math.round(vs), 0)}%`}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </TableCard>
        )}
      </div>
    </Card>
  )
}
