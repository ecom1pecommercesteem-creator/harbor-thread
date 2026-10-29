import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, StatusBadge, type Tone } from '@/components/ui/Badge'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState, InfoRow } from '@/components/ui/Display'
import { useFmt } from '@/lib/format'
import { useFarm } from '@/store'
import { useFacilityEquipment } from '@/store/hooks'
import type { PumpState, Reservoir } from '@/types'

const PUMP_TONE: Record<PumpState, Tone> = { running: 'lime', idle: 'neutral', fault: 'crit' }

export function IrrigationPump({ res }: { res: Reservoir }) {
  const fmt = useFmt()
  const equipment = useFacilityEquipment()
  const pumpState = useFarm((s) => s.resLive[res.id]?.pump)
  const pump = equipment.find((e) => e.type === 'pump' && e.reservoirId === res.id)
  const overdue = pump ? new Date(pump.maintenanceDue).getTime() < Date.now() : false

  return (
    <Card>
      <CardHeader title="Irrigation pump" subtitle="Pump that feeds this reservoir." />
      <div className="p-5">
        {!pump ? (
          <EmptyState title="No pump registered" message="No irrigation pump is linked to this reservoir." />
        ) : (
          <>
            <dl>
              <InfoRow label="Equipment">{pump.name} <span className="text-mute">· {pump.model}</span></InfoRow>
              <InfoRow label="Health"><StatusBadge status={pump.status} /></InfoRow>
              <InfoRow label="Pump state">
                {pumpState ? <Badge tone={PUMP_TONE[pumpState]} dot className="capitalize">{pumpState}</Badge> : <span className="text-mute">No data</span>}
              </InfoRow>
              <InfoRow label="Next maintenance">
                <span className={overdue ? 'text-crit' : undefined}>{fmt.date(pump.maintenanceDue)}{overdue ? ' (overdue)' : ''}</span>
              </InfoRow>
            </dl>
            {pumpState === 'fault' && <p className="mt-3 text-xs text-crit">The pump reports a fault. Check the equipment record.</p>}
            {pump.faults[0] && pump.status !== 'operational' && (
              <p className="mt-3 text-xs text-warn">{pump.faults[0].code}: {pump.faults[0].message}</p>
            )}
            <Link to={`/equipment?eq=${pump.id}`} className="mt-4 inline-flex items-center gap-1.5 text-sm text-lime hover:underline">
              Open equipment record <ArrowUpRight aria-hidden className="size-4" />
            </Link>
          </>
        )}
      </div>
    </Card>
  )
}
