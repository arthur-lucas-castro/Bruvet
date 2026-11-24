import { useMemo } from 'react'
import { formatCurrency } from '../../lib/format'
import { currentMonth, formatMonth, monthRange } from './month-range'
import { useShiftSummary } from './shifts-api'

/** Para veterinários e enfermagem: os próprios plantões do mês e o que falta receber. */
export function MyShiftsCard() {
  const month = currentMonth()
  const range = useMemo(() => monthRange(month), [month])
  const { data } = useShiftSummary(range)
  const row = data?.rows[0]
  if (!row) return null

  const items: [string, string][] = [
    ['Plantões realizados', `${row.done}${row.absences ? ` · ${row.absences} falta(s)` : ''}`],
    ['Valor realizado', formatCurrency(row.doneCents)],
    ['Já recebido', formatCurrency(row.paidCents)],
    ['A receber', formatCurrency(row.pendingCents)],
    ['Ainda por fazer', formatCurrency(row.scheduledCents)],
  ]

  return (
    <section aria-labelledby="meus-plantoes" className="rounded-xl border border-border bg-card">
      <header className="border-b border-border px-5 py-3.5">
        <h2 id="meus-plantoes" className="font-semibold">
          Meus plantões — {formatMonth(month)}
        </h2>
      </header>
      <dl className="grid grid-cols-2 gap-4 px-5 py-4 lg:grid-cols-5">
        {items.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 font-mono font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
