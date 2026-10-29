import { useMemo } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { EmptyState, InfoRow, Section } from '@/components/ui/Display'
import { CROP_BY_ID, DAY, stageFor } from '@/data/seed'
import { useFmt } from '@/lib/format'
import { useFacilityBatches } from '@/store/hooks'
import { InfoNote } from './ZonePrimitives'
import type { ZoneView } from './zoneView'

export function ZoneCropBatches({ view }: { view: ZoneView }) {
  const fmt = useFmt()
  const batches = useFacilityBatches()
  const { zone, crop } = view
  const rows = useMemo(() => {
    const now = Date.now()
    return batches
      .filter((b) => b.zoneId === zone.id && !b.harvestedAt)
      .map((b) => {
        const c = CROP_BY_ID.get(b.cropProfileId)!
        const days = Math.max(0, Math.floor((now - Date.parse(b.plantedAt)) / DAY))
        return { batch: b, days, stage: stageFor(days, c.cycleDays) }
      })
  }, [batches, zone.id])

  return (
    <Section title="Crop & batches">
      {!crop ? (
        <InfoNote>No crop assigned — this zone is idle.</InfoNote>
      ) : (
        <>
          <dl className="mb-4 rounded-xl border border-line bg-card-2 px-4">
            <InfoRow label="Crop">{crop.name}</InfoRow>
            <InfoRow label="Variety">{crop.variety}</InfoRow>
            <InfoRow label="Category">{crop.category}</InfoRow>
            <InfoRow label="Cycle length">{crop.cycleDays} days</InfoRow>
            <InfoRow label="Layout">
              {zone.racks} racks × {zone.shelvesPerRack} shelves · {zone.areaM2} m²
            </InfoRow>
          </dl>
          {rows.length === 0 ? (
            <EmptyState title="No active batches" message="This zone has no unharvested batches right now." />
          ) : (
            <ul className="space-y-2">
              {rows.map(({ batch, days, stage }) => (
                <li key={batch.id}>
                  <Link
                    to={`/crops?batch=${encodeURIComponent(batch.id)}`}
                    className="group flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-card-2 p-4 transition-colors hover:border-dim"
                  >
                    <div className="min-w-0">
                      <div className="text-sm text-ink">{batch.id}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-mute">
                        <Badge>{stage}</Badge>
                        <span>Planted {fmt.shortDate(batch.plantedAt)} · day {days}</span>
                      </div>
                    </div>
                    <div className="text-right text-xs text-mute">
                      <div>Harvest ETA {fmt.shortDate(batch.harvestEta)}</div>
                      <div className="text-ink">{fmt.until(batch.harvestEta)}</div>
                    </div>
                    <ArrowUpRight aria-hidden className="size-4 text-mute transition-colors group-hover:text-lime" />
                    <span className="sr-only">Open batch {batch.id} in Crops</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Section>
  )
}
