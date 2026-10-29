import { useMemo, useState } from 'react'
import { Badge, type Tone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, Section, TableCard, td, th, tr } from '@/components/ui/Display'
import { useFmt } from '@/lib/format'
import { useFarm } from '@/store'
import type { IrrigationEvent, Reservoir } from '@/types'

const PAGE_SIZE = 15
const TRIGGER_LABEL: Record<IrrigationEvent['trigger'], string> = { schedule: 'Schedule', 'demo-manual': 'Demo (manual)', 'auto-refill': 'Auto-refill' }
const TRIGGER_TONE: Record<IrrigationEvent['trigger'], Tone> = { schedule: 'neutral', 'demo-manual': 'info', 'auto-refill': 'forest' }

export function IrrigationHistory({ res }: { res: Reservoir }) {
  const fmt = useFmt()
  const events = useFarm((s) => s.irrigation)
  const rows = useMemo(
    () => events.filter((e) => e.reservoirId === res.id).sort((a, b) => b.at.localeCompare(a.at)),
    [events, res.id],
  )
  const [limit, setLimit] = useState(PAGE_SIZE)

  return (
    <Section title="Irrigation activity">
      {rows.length === 0 ? (
        <EmptyState title="No irrigation events" message="Scheduled, auto-refill and demo runs for this reservoir will appear here." />
      ) : (
        <>
          <TableCard>
            <table className="w-full min-w-[480px] text-left">
              <caption className="sr-only">Irrigation events for {res.name}, newest first</caption>
              <thead>
                <tr>
                  <th scope="col" className={th}>Time</th>
                  <th scope="col" className={th}>Trigger</th>
                  <th scope="col" className={th}>Duration</th>
                  <th scope="col" className={th}>Volume</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, limit).map((e) => (
                  <tr key={e.id} className={tr}>
                    <td className={td}>{fmt.dateTime(e.at)}</td>
                    <td className={td}><Badge tone={TRIGGER_TONE[e.trigger]}>{TRIGGER_LABEL[e.trigger]}</Badge></td>
                    <td className={td}>{e.durationMin} min</td>
                    <td className={`${td} tabular-nums`}>{fmt.vol(e.volumeL)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>
          {rows.length > limit && (
            <div className="mt-3 flex justify-center">
              <Button variant="secondary" size="sm" onClick={() => setLimit((l) => l + PAGE_SIZE)}>Show more</Button>
            </div>
          )}
        </>
      )}
    </Section>
  )
}
