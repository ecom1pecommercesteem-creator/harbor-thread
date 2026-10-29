import { Link } from 'react-router-dom'
import { StatusBadge } from '@/components/ui/Badge'
import { Card, CardHeader } from '@/components/ui/Card'
import { useFmt } from '@/lib/format'
import type { Equipment, Zone, ZoneLive } from '@/types'
import type { ActiveZone } from './envModel'

export function SensorPanel({ zones, idle, live, equipment }: { zones: ActiveZone[]; idle: Zone[]; live: Record<string, ZoneLive>; equipment: Equipment[] }) {
  const f = useFmt()
  const online = zones.filter((z) => live[z.id]?.sensorOnline).length
  return (
    <Card>
      <CardHeader
        title="Sensor availability"
        subtitle="One sensor node per active zone, reporting every 5 s."
        action={<span className="text-[13px] text-mute">{online} of {zones.length} sensors online</span>}
      />
      <ul className="mt-4 divide-y divide-line/70 border-t border-line/70">
        {zones.map((z) => {
          const l = live[z.id] as ZoneLive | undefined
          const isOnline = l?.sensorOnline === true
          const eq = equipment.find((e) => e.id === `EQ-SNS-${z.code}`)
          return (
            <li key={z.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3.5 text-sm">
              <span className="w-24 text-ink">Zone {z.code}</span>
              <StatusBadge status={isOnline ? 'operational' : 'offline'} label={isOnline ? 'Online' : 'Offline'} />
              <span className="text-mute">{l ? `Updated ${f.ago(l.updatedAt)}` : 'No readings yet'}</span>
              {!isOnline && <span className="basis-full text-xs text-warn sm:basis-auto">No fresh data — showing last known values</span>}
              {eq && (
                <Link to={`/equipment?eq=${eq.id}`} className="ml-auto text-[13px] text-lime hover:underline">
                  {eq.name} · details
                </Link>
              )}
            </li>
          )
        })}
      </ul>
      {idle.length > 0 && (
        <p className="border-t border-line/70 px-5 py-3 text-xs text-dim">
          {idle.length} idle {idle.length === 1 ? 'zone has' : 'zones have'} no sensors reporting: {idle.map((z) => `Zone ${z.code}`).join(', ')}.
        </p>
      )}
    </Card>
  )
}
