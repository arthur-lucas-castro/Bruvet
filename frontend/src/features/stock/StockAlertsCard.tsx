import { CalendarClock, CalendarX2, CircleCheck, PackageMinus } from 'lucide-react'
import { Link } from 'react-router'
import { formatDate } from '../../lib/format'
import { useStockAlerts } from './stock-api'
import { EXPIRY_WARNING_DAYS, formatQuantity } from './units'

const MAX_ITEMS = 5

/** Resumo dos alertas de estoque para o painel inicial. */
export function StockAlertsCard() {
  const { data, isPending, isError } = useStockAlerts()
  if (isPending || isError) return null

  const total = data.lowStock.length + data.expiring.length + data.expired.length

  return (
    <section aria-labelledby="alertas-estoque" className="rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <h2 id="alertas-estoque" className="font-semibold">
          Alertas de estoque
        </h2>
        <Link to="/estoque" className="text-sm font-semibold text-primary hover:underline">
          Ver estoque
        </Link>
      </header>

      {total === 0 ? (
        <p className="flex items-center gap-2 px-5 py-4 text-sm text-success">
          <CircleCheck className="size-4" aria-hidden="true" />
          Nenhum alerta: estoque dentro do mínimo e sem lotes vencendo.
        </p>
      ) : (
        <div className="grid divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0">
          <AlertList
            icon={<PackageMinus className="size-4 text-accent" aria-hidden="true" />}
            title="Abaixo do mínimo"
            filter="baixo"
            items={data.lowStock.map((m) => ({
              key: m.id,
              to: `/estoque/${m.id}`,
              label: m.name,
              detail: `${formatQuantity(m.available, m.unit)} de ${formatQuantity(m.minStock, m.unit)}`,
            }))}
          />
          <AlertList
            icon={<CalendarClock className="size-4 text-accent" aria-hidden="true" />}
            title={`Vencendo em ${EXPIRY_WARNING_DAYS} dias`}
            filter="vencendo"
            items={data.expiring.map((b) => ({
              key: b.batchId,
              to: `/estoque/${b.medication.id}`,
              label: b.medication.name,
              detail: `Lote ${b.batchNumber} · ${formatDate(b.expiresAt)}`,
            }))}
          />
          <AlertList
            icon={<CalendarX2 className="size-4 text-destructive" aria-hidden="true" />}
            title="Vencidos com saldo"
            filter="vencido"
            items={data.expired.map((b) => ({
              key: b.batchId,
              to: `/estoque/${b.medication.id}`,
              label: b.medication.name,
              detail: `Lote ${b.batchNumber} · ${formatQuantity(b.quantity, b.medication.unit)}`,
            }))}
          />
        </div>
      )}
    </section>
  )
}

type AlertListProps = {
  icon: React.ReactNode
  title: string
  filter: string
  items: { key: string; to: string; label: string; detail: string }[]
}

function AlertList({ icon, title, filter, items }: AlertListProps) {
  return (
    <div className="px-5 py-4">
      <p className="flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
        <span className="font-mono text-muted-foreground">({items.length})</span>
      </p>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Nenhum.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {items.slice(0, MAX_ITEMS).map((item) => (
            <li key={item.key} className="text-sm">
              <Link to={item.to} className="font-medium hover:text-primary">
                {item.label}
              </Link>
              <span className="block text-xs text-muted-foreground">{item.detail}</span>
            </li>
          ))}
          {items.length > MAX_ITEMS && (
            <li>
              <Link to={`/estoque?status=${filter}`} className="text-sm font-semibold text-primary hover:underline">
                Ver todos ({items.length})
              </Link>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
