import { HandCoins } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { Field, Input, Textarea } from '../../components/ui/Field'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { ApiError } from '../../lib/api'
import { formatCurrency } from '../../lib/format'
import { ROLE_LABELS } from '../auth/auth-api'
import { currentMonth, formatMonth, monthRange } from './month-range'
import { usePayShifts, useShiftSummary, type ShiftSummaryRow } from './shifts-api'

const hours = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

/** Totais do mês por profissional e o pagamento dos plantões realizados (admin). */
export function ShiftPaymentsTab() {
  const [month, setMonth] = useState(currentMonth)
  const range = useMemo(() => monthRange(month), [month])
  const { data, isPending, isError, isPlaceholderData } = useShiftSummary(range)
  const [paying, setPaying] = useState<ShiftSummaryRow | null>(null)

  const totals = data
    ? ([
        ['Realizado', data.totals.doneCents],
        ['Pago', data.totals.paidCents],
        ['A pagar', data.totals.pendingCents],
        ['Previsto', data.totals.scheduledCents],
      ] as const)
    : []

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <Field label="Mês" className="sm:w-56" hint="Plantões contam no mês em que começam.">
          {(a11y) => (
            <Input {...a11y} type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
          )}
        </Field>
        {totals.length > 0 && (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
            {totals.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
                <dd className="font-mono font-semibold">{formatCurrency(value)}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <section aria-label={`Plantões de ${formatMonth(month)}`} className="rounded-xl border border-border bg-card">
        {isPending ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState />
        ) : data.rows.length === 0 ? (
          <EmptyState icon={HandCoins} title={`Nenhum plantão em ${formatMonth(month)}`} />
        ) : (
          <div className={`overflow-x-auto ${isPlaceholderData ? 'opacity-60' : ''}`}>
            <table className="w-full min-w-[46rem] text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">Profissional</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">Realizados</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">Faltas</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">Horas</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">Pago</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">A pagar</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">Previsto</th>
                  <th scope="col" className="px-5 py-3">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.rows.map((row) => (
                  <tr key={row.user.id}>
                    <th scope="row" className="px-5 py-3 text-left font-medium">
                      {row.user.name}
                      <span className="block text-xs font-normal text-muted-foreground">
                        {row.user.role === 'enfermeiro' ? ROLE_LABELS.enfermeiro : 'Veterinário'}
                      </span>
                    </th>
                    <td className="px-3 py-3 text-right font-mono">{row.done}</td>
                    <td className="px-3 py-3 text-right font-mono">{row.absences}</td>
                    <td className="px-3 py-3 text-right font-mono">{hours.format(row.hours)}</td>
                    <td className="px-3 py-3 text-right font-mono">{formatCurrency(row.paidCents)}</td>
                    <td className="px-3 py-3 text-right font-mono font-semibold">{formatCurrency(row.pendingCents)}</td>
                    <td className="px-3 py-3 text-right font-mono text-muted-foreground">
                      {formatCurrency(row.scheduledCents)}
                    </td>
                    <td className="px-5 py-2 text-right">
                      {row.pendingShiftIds.length > 0 && (
                        <Button variant="secondary" onClick={() => setPaying(row)}>
                          Pagar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="text-sm text-muted-foreground">
        Só entram em “A pagar” os plantões que já terminaram e não são falta. Para desfazer um pagamento, abra o plantão
        na escala.
      </p>

      <Dialog
        open={paying !== null}
        onClose={() => setPaying(null)}
        title={`Pagar plantões de ${paying?.user.name ?? ''}`}
        description={paying ? `${paying.pendingShiftIds.length} plantão(ões) realizado(s) em ${formatMonth(month)}.` : undefined}
      >
        {paying && <PayForm row={paying} onClose={() => setPaying(null)} />}
      </Dialog>
    </div>
  )
}

function PayForm({ row, onClose }: { row: ShiftSummaryRow; onClose: () => void }) {
  const pay = usePayShifts()
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      await pay.mutateAsync({ shiftIds: row.pendingShiftIds, notes: notes.trim() || null })
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível registrar o pagamento.')
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <Alert>{error}</Alert>}
      <p className="text-sm">
        Total: <span className="font-mono text-lg font-semibold">{formatCurrency(row.pendingCents)}</span>
      </p>
      <Field label="Observação do pagamento" hint="Ex.: forma de pagamento, comprovante, nota fiscal.">
        {(a11y) => <Textarea {...a11y} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} autoFocus />}
      </Field>
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" loading={pay.isPending}>
          Registrar pagamento
        </Button>
      </div>
    </form>
  )
}
