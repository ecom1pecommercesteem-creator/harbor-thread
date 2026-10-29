import { useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { cx } from '@/lib/format'
import type { Equipment, EquipmentType, HealthStatus } from '@/types'
import { STATUS_LABEL, STATUS_ORDER, TYPE_META, TYPE_ORDER } from './model'

interface Props {
  equipment: Equipment[]
  activeStatus: string
  onStatus: (s: HealthStatus) => void
}

export function EquipmentSummary({ equipment, activeStatus, onStatus }: Props) {
  const { byStatus, byType } = useMemo(() => {
    const byStatus: Record<HealthStatus, number> = { operational: 0, warning: 0, critical: 0, offline: 0 }
    const byType: Record<EquipmentType, number> = { pump: 0, light: 0, hvac: 0, sensor: 0, gateway: 0 }
    for (const e of equipment) {
      byStatus[e.status]++
      byType[e.type]++
    }
    return { byStatus, byType }
  }, [equipment])

  return (
    <Card className="p-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {STATUS_ORDER.map((s) => {
          const active = activeStatus === s
          return (
            <button
              key={s}
              type="button"
              aria-pressed={active}
              onClick={() => onStatus(s)}
              className={cx('flex items-center justify-between gap-3 rounded-xl border px-3 py-3 sm:px-4 text-left transition-colors', active ? 'border-lime bg-lime/10' : 'border-line bg-card-2 hover:border-dim')}
            >
              <StatusBadge status={s} label={STATUS_LABEL[s]} />
              <span className="text-[26px] font-light leading-none">{byStatus[s]}</span>
            </button>
          )
        })}
      </div>
      <ul aria-label="Equipment count by type" className="mt-4 flex flex-wrap gap-2">
        {TYPE_ORDER.map((t) => {
          const Icon = TYPE_META[t].icon
          return (
            <li key={t} className="flex items-center gap-2 rounded-full bg-chip px-3 py-1.5 text-[13px] text-mute">
              <Icon aria-hidden className="size-3.5" />
              {TYPE_META[t].plural}
              <span className="font-medium text-ink">{byType[t]}</span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
