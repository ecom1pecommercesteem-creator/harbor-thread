import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { IrrigationHistory } from '@/components/domain/water/IrrigationHistory'
import { IrrigationPump } from '@/components/domain/water/IrrigationPump'
import { ReservoirOverview } from '@/components/domain/water/ReservoirOverview'
import { RunIrrigationDemo } from '@/components/domain/water/RunIrrigationDemo'
import { WaterReadings } from '@/components/domain/water/WaterReadings'
import { WaterTrends } from '@/components/domain/water/WaterTrends'
import { useReservoirContext } from '@/components/domain/water/waterModel'
import { EmptyState, PageHeader } from '@/components/ui/Display'
import { RANGE_OPTIONS, Segmented } from '@/components/ui/Form'
import { useFarm } from '@/store'
import { useReservoirs } from '@/store/hooks'
import type { Reservoir, TimeRange } from '@/types'

function ReservoirDetail({ res, range }: { res: Reservoir; range: TimeRange }) {
  const ctx = useReservoirContext(res)
  return (
    <>
      <ReservoirOverview res={res} ctx={ctx} />
      <WaterReadings res={res} ctx={ctx} />
      <WaterTrends res={res} ctx={ctx} range={range} />
      <div className="grid gap-4 xl:grid-cols-2">
        <IrrigationPump res={res} />
        <RunIrrigationDemo res={res} />
      </div>
      <IrrigationHistory res={res} />
    </>
  )
}

export default function Water() {
  const reservoirs = useReservoirs()
  const [params, setParams] = useSearchParams()
  const defaultRange = useFarm((s) => s.settings.display.defaultRange)
  const [range, setRange] = useState<TimeRange>(defaultRange)

  const res = reservoirs.find((r) => r.id === params.get('res')) ?? reservoirs[0]
  const selectReservoir = (id: string) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('res', id)
      return next
    })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Water & Nutrients"
        description="Reservoir level, pH and EC against the crop recipes each reservoir feeds, plus irrigation activity."
      />
      {!res ? (
        <EmptyState title="No reservoirs" message="This facility has no reservoirs configured." />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Segmented
              label="Reservoir"
              value={res.id}
              onChange={selectReservoir}
              options={reservoirs.map((r) => ({ value: r.id, label: r.name.split(' · ')[0] }))}
            />
            <Segmented<TimeRange> label="Time range" value={range} onChange={setRange} options={RANGE_OPTIONS} />
          </div>
          <ReservoirDetail key={res.id} res={res} range={range} />
        </>
      )}
    </div>
  )
}
