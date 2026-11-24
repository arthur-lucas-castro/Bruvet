import { useState } from 'react'
import { Link } from 'react-router'
import { formatCurrency, localDayStartIso, todayInput } from '../../lib/format'
import { useFinanceSummary } from './finance-api'

/** Resumo do mês para o admin no painel inicial. */
export function FinanceSnapshotCard() {
  // Mês atual no calendário local, calculado uma vez ao montar
  const [range] = useState(() => {
    const today = todayInput()
    return { from: localDayStartIso(`${today.slice(0, 8)}01`), until: localDayStartIso(today, 1) }
  })
  const { data, isPending, isError } = useFinanceSummary(range)
  if (isPending || isError) return null
  const { kpis } = data

  const items = [
    ['Faturamento do mês', formatCurrency(kpis.revenueCents)],
    [
      'Margem bruta',
      `${formatCurrency(kpis.grossMarginCents)}${kpis.grossMarginPercent !== null ? ` · ${kpis.grossMarginPercent.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` : ''}`,
    ],
    ['Recebido no mês', formatCurrency(kpis.receivedCents)],
    ['A receber (total)', formatCurrency(kpis.receivableCents)],
  ]

  return (
    <section aria-labelledby="resumo-financeiro" className="rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <h2 id="resumo-financeiro" className="font-semibold">
          Financeiro
        </h2>
        <Link to="/financeiro" className="text-sm font-semibold text-primary hover:underline">
          Ver detalhes
        </Link>
      </header>
      <dl className="grid grid-cols-2 gap-4 px-5 py-4 lg:grid-cols-4">
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
