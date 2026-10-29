import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState, TableCard, td, th, tr } from '@/components/ui/Display'
import { FilterSelect } from '@/components/ui/Form'
import { downloadCsv } from '@/lib/format'
import { useFarm } from '@/store'
import { DATASETS, type AnalyticsModel, type Dataset, type RangeKey } from './model'

const PREVIEW_ROWS = 8

export function ExportPanel({ m, range }: { m: AnalyticsModel; range: RangeKey }) {
  const [dataset, setDataset] = useState<Dataset>('water-energy')
  const rows = m.datasets[dataset]
  const label = DATASETS.find((d) => d.value === dataset)?.label ?? dataset
  const cols = rows[0] ? Object.keys(rows[0]) : []

  const onExport = () => {
    const { toast } = useFarm.getState()
    if (!rows.length) {
      toast('error', 'No data to export for this selection.')
      return
    }
    downloadCsv(`verdantos-${dataset}-${range}.csv`, rows)
    toast('success', `Exported ${rows.length} row${rows.length === 1 ? '' : 's'}: ${label}, ${range}.`)
  }

  return (
    <Card>
      <CardHeader
        title="Export data"
        subtitle="The CSV matches the dataset and date range selected here. Units are in the column headers."
        action={
          <Button variant="primary" size="sm" icon={<Download className="size-4" />} onClick={onExport}>
            Export CSV
          </Button>
        }
      />
      <div className="space-y-4 px-5 pb-5 pt-4">
        <div className="max-w-sm">
          <FilterSelect
            label="Dataset"
            value={dataset}
            onChange={(v) => {
              const next = DATASETS.find((d) => d.value === v)
              if (next) setDataset(next.value)
            }}
            options={DATASETS}
          />
        </div>
        {rows.length === 0 ? (
          <EmptyState title="Nothing to export" message="No data for this dataset and range in the selected facility." />
        ) : (
          <>
            <p className="text-xs text-mute">Preview: first {Math.min(PREVIEW_ROWS, rows.length)} of {rows.length} rows.</p>
            <TableCard>
              <table className="w-full min-w-[640px]">
                <caption className="sr-only">Preview of the {label} dataset</caption>
                <thead>
                  <tr>
                    {cols.map((c) => (
                      <th key={c} scope="col" className={th}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, PREVIEW_ROWS).map((r, i) => (
                    <tr key={i} className={tr}>
                      {cols.map((c) => (
                        <td key={c} className={td}>{String(r[c])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableCard>
          </>
        )}
      </div>
    </Card>
  )
}
