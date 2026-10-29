import type { ReactNode } from 'react'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { cx } from '@/lib/format'
import { ReadingValue, StaleNotice } from './ZonePrimitives'
import { hourLabel, PUMP_LABEL, type ZoneView } from './zoneView'

function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-mute">{label}</dt>
      <dd className="mt-0.5 text-base text-ink">{children}</dd>
    </div>
  )
}

export function ZoneCard({ view, onOpen }: { view: ZoneView; onOpen: () => void }) {
  const { zone, crop, live, res } = view
  const idle = !crop
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cx(
        'flex h-full w-full flex-col rounded-card border p-5 text-left transition-colors hover:border-dim',
        idle ? 'border-line/60 bg-card/50 text-mute' : 'border-line bg-card',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-mute">Zone {zone.code}</p>
          <h3 className="truncate text-lg font-normal text-ink">{zone.name}</h3>
        </div>
        {idle ? <Badge>Idle</Badge> : <StatusBadge status={view.health} />}
      </div>

      <p className="mt-3 text-sm text-ink">
        {crop ? (
          <>
            {crop.name} <span className="text-mute">· {crop.variety}</span>
          </>
        ) : (
          <span className="text-mute">Idle — no crop</span>
        )}
      </p>
      <p className="mt-1 text-xs text-mute">
        {zone.racks} racks × {zone.shelvesPerRack} shelves · {zone.areaM2} m²
      </p>

      {crop && live && (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
            <Cell label="Temperature">
              <ReadingValue view={view} metric="temperature" />
            </Cell>
            <Cell label="Humidity">
              <ReadingValue view={view} metric="humidity" />
            </Cell>
            <Cell label="pH">
              <ReadingValue view={view} metric="ph" />
            </Cell>
            <Cell label="EC">
              <ReadingValue view={view} metric="ec" />
            </Cell>
            <Cell label="Lights">
              {live.lightsOn ? 'On' : 'Off'}{' '}
              <span className="text-xs text-mute">
                · {hourLabel(zone.lightsOn[0])}–{hourLabel(zone.lightsOn[1])}
              </span>
            </Cell>
            <Cell label="Irrigation">
              <span className="block truncate text-sm">{view.reservoirName}</span>
              <span className="text-xs text-mute">
                {res ? `${PUMP_LABEL[res.pump]} · level ${res.levelPct.toFixed(0)} %` : '—'}
              </span>
            </Cell>
          </dl>
          {view.stale && <StaleNotice view={view} className="mt-4" />}
        </>
      )}
    </button>
  )
}
