import { Receipt } from 'lucide-react'
import { Link } from 'react-router'
import { Select } from '../../components/ui/Field'
import { Pagination } from '../../components/ui/Pagination'
import { SearchInput } from '../../components/ui/SearchInput'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { formatCurrency, formatInstantDate } from '../../lib/format'
import { useListParams } from '../../lib/use-list-params'
import { KIND_LABELS, formatAttendanceCode } from '../attendances/constants'
import { BillStatusBadge } from './BillStatusBadge'
import { useBills, type BillStatus } from './billing-api'

const PAGE_SIZE = 20

/** Caixa: comandas para cobrar (todas as pessoas da equipe podem receber). */
export function BillsPage() {
  const { values, page, setFilter, setPage } = useListParams(['q', 'status'] as const)
  const status = (['paga', 'cancelada', 'todas'].includes(values.status) ? values.status : 'aberta') as BillStatus | 'todas'
  const { data, isPending, isError, isPlaceholderData } = useBills({ q: values.q, status, page, pageSize: PAGE_SIZE })
  const pageBalance = data?.items.reduce((sum, b) => sum + Math.max(0, b.totals.balanceCents), 0) ?? 0

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        O que cobrar de cada tutor. A comanda nasce com o atendimento e soma procedimentos, medicamentos cobrados e
        itens avulsos.
      </p>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="grid gap-3 border-b border-border p-4 sm:grid-cols-[1fr_auto]">
          <SearchInput
            value={values.q}
            onChange={(q) => setFilter('q', q)}
            label="Buscar comandas"
            placeholder="Paciente, tutor, CPF, telefone ou nº do atendimento"
          />
          <Select
            aria-label="Filtrar por situação"
            value={status}
            onChange={(e) => setFilter('status', e.target.value === 'aberta' ? '' : e.target.value)}
          >
            <option value="aberta">Em aberto</option>
            <option value="paga">Pagas</option>
            <option value="cancelada">Canceladas</option>
            <option value="todas">Todas</option>
          </Select>
        </div>

        {isPending ? (
          <LoadingState label="Carregando comandas..." />
        ) : isError ? (
          <ErrorState message="Não foi possível carregar as comandas." />
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={values.q || status !== 'aberta' ? 'Nenhuma comanda encontrada' : 'Nenhuma comanda em aberto'}
            description={status === 'aberta' && !values.q ? 'Tudo recebido por aqui.' : 'Tente outro termo ou filtro.'}
          />
        ) : (
          <div className={isPlaceholderData ? 'opacity-60 transition-opacity' : ''}>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Paciente / tutor</th>
                  <th scope="col" className="hidden px-4 py-3 font-semibold md:table-cell">Atendimento</th>
                  <th scope="col" className="hidden px-4 py-3 text-right font-semibold sm:table-cell">Total</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((b) => (
                  <tr key={b.id} className="relative transition-colors duration-150 hover:bg-muted/40">
                    <td className="px-4 py-3">
                      {/* O link cobre a linha inteira (after:absolute) */}
                      <Link to={`/comandas/${b.id}`} className="font-medium after:absolute after:inset-0 hover:text-primary">
                        {b.attendance.patient.name}
                      </Link>
                      <p className="text-muted-foreground">{b.attendance.patient.tutor.name}</p>
                      <p className="font-mono text-xs text-muted-foreground md:hidden">
                        atd. {formatAttendanceCode(b.attendance.code)} · {formatInstantDate(b.attendance.startedAt)}
                      </p>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <p>{KIND_LABELS[b.attendance.kind]}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {formatAttendanceCode(b.attendance.code)} · {formatInstantDate(b.attendance.startedAt)}
                      </p>
                    </td>
                    <td className="hidden px-4 py-3 text-right font-mono sm:table-cell">{formatCurrency(b.totals.totalCents)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="block font-mono font-semibold">{formatCurrency(b.totals.balanceCents)}</span>
                      <BillStatusBadge status={b.totals.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {status === 'aberta' && (
              <p className="border-t border-border px-4 py-3 text-right text-sm text-muted-foreground">
                Saldo desta página: <span className="font-mono font-semibold text-foreground">{formatCurrency(pageBalance)}</span>
              </p>
            )}
            <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  )
}
