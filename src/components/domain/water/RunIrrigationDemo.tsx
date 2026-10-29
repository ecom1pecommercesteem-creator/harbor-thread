import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { Field, Select } from '@/components/ui/Form'
import { ConfirmDialog } from '@/components/ui/Overlay'
import { useFarm } from '@/store'
import type { Reservoir } from '@/types'

const DURATIONS = [
  { value: '2', label: '2 min' },
  { value: '5', label: '5 min' },
  { value: '10', label: '10 min' },
] as const

export function RunIrrigationDemo({ res }: { res: Reservoir }) {
  const [minutes, setMinutes] = useState<string>('5')
  const [confirming, setConfirming] = useState(false)
  const name = res.name.split(' · ')[0]

  return (
    <Card>
      <CardHeader
        title={<span className="flex flex-wrap items-center gap-2">Run irrigation <Badge tone="info">Demo</Badge></span>}
        subtitle="Logs a simulated irrigation event for this reservoir. Nothing is switched on."
      />
      <div className="flex flex-wrap items-end gap-3 p-5">
        <div className="w-40">
          <Field label="Duration">
            {(id, describedBy) => (
              <Select id={id} aria-describedby={describedBy} value={minutes} onChange={(e) => setMinutes(e.target.value)}>
                {DURATIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </Select>
            )}
          </Field>
        </div>
        <Button variant="primary" onClick={() => setConfirming(true)}>Run irrigation (demo)</Button>
      </div>
      <ConfirmDialog
        open={confirming}
        title="Run demo irrigation?"
        message={
          <>
            <span className="block">This is a demonstration. No real pump or valve will be operated.</span>
            <span className="mt-2 block">A simulated {minutes}-minute irrigation event will be logged for {name}.</span>
          </>
        }
        confirmLabel="Log demo run"
        onConfirm={() => {
          useFarm.getState().runDemoIrrigation(res.id, Number(minutes))
          setConfirming(false)
        }}
        onCancel={() => setConfirming(false)}
      />
    </Card>
  )
}
