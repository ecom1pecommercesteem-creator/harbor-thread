import { Droplets, Lightbulb, Radio, Router, Wind, type LucideIcon } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '@/components/ui/Badge'
import { Card, CardHeader } from '@/components/ui/Card'
import { ZONE_BY_ID } from '@/data/seed'
import { cx } from '@/lib/format'
import { useFacilityEquipment } from '@/store/hooks'
import type { Equipment, EquipmentType, HealthStatus } from '@/types'

const GROUPS: { type: EquipmentType[]; label: string; icon: LucideIcon }[] = [
  { type: ['pump'], label: 'Irrigation pumps', icon: Droplets },
  { type: ['light'], label: 'LED grow lights', icon: Lightbulb },
  { type: ['hvac'], label: 'HVAC systems', icon: Wind },
  { type: ['sensor', 'gateway'], label: 'Sensors & gateways', icon: Radio },
]
const SEG: Record<HealthStatus, string> = { operational: 'bg-ok', warning: 'bg-warn', critical: 'bg-crit', offline: 'bg-dim' }

/** Offline gear in an idle zone is expected standby, not a fault. */
const standby = (e: Equipment) => e.status === 'offline' && !!e.zoneId && !ZONE_BY_ID.get(e.zoneId)?.cropProfileId

export function EquipmentHealth() {
  const equipment = useFacilityEquipment()
  const rows = useMemo(() => GROUPS.map((g) => {
    const items = equipment.filter((e) => g.type.includes(e.type) && !standby(e))
    const c: Record<HealthStatus, number> = { operational: 0, warning: 0, critical: 0, offline: 0 }
    items.forEach((e) => c[e.status]++)
    return { ...g, items, c }
  }), [equipment])
  const attention = equipment.filter((e) => !standby(e) && e.status !== 'operational')
  const idle = equipment.filter(standby).length
  return (
    <Card>
      <CardHeader title="Equipment health" subtitle="Operational · warning · critical · offline" action={<Link to="/equipment" className="text-[13px] text-lime hover:underline">Inventory</Link>} />
      <ul className="space-y-4 px-5 pt-5">
        {rows.map(({ label, icon: Icon, items, c }) => (
          <li key={label}>
            <div className="mb-1.5 flex items-center justify-between text-sm"><span className="flex items-center gap-2"><Icon aria-hidden className="size-4 text-mute" />{label}</span><span className="text-xs text-mute">{c.operational}/{items.length} operational</span></div>
            <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={`${label}: ${c.operational} operational, ${c.warning} warning, ${c.critical} critical, ${c.offline} offline`}>
              {(['operational', 'warning', 'critical', 'offline'] as const).map((s) => c[s] > 0 && <span key={s} className={cx('h-full', SEG[s])} style={{ flex: c[s] }} />)}
            </div>
          </li>
        ))}
      </ul>
      <div className="p-5 pt-4">
        {attention.length > 0 && (
          <ul className="space-y-1 border-t border-line pt-3">
            {attention.slice(0, 4).map((e) => (
              <li key={e.id}><Link to={`/equipment?eq=${e.id}`} className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 text-sm hover:bg-card-2"><span className="min-w-0 truncate">{e.name}</span><StatusBadge status={e.status} /></Link></li>
            ))}
          </ul>
        )}
        {idle > 0 && <p className="mt-2 flex items-center gap-2 text-xs text-dim"><Router aria-hidden className="size-3.5" />{idle} devices in idle zones are on standby and excluded from the totals above.</p>}
      </div>
    </Card>
  )
}
