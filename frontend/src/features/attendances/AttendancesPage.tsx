import { Plus, Stethoscope } from 'lucide-react'
import { Link } from 'react-router'
import { ButtonLink } from '../../components/ui/ButtonLink'
import { Checkbox, Select } from '../../components/ui/Field'
import { Pagination } from '../../components/ui/Pagination'
import { SearchInput } from '../../components/ui/SearchInput'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { formatRecordCode } from '../../lib/format'
import { useListParams } from '../../lib/use-list-params'
import { useAuthenticatedUser } from '../auth/auth-api'
import { useAttendances } from './attendances-api'
import { KIND_LABELS, formatAttendanceCode, type AttendanceStatus } from './constants'
import { StatusBadge } from './StatusBadge'

const PAGE_SIZE = 20
const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

export function AttendancesPage() {
  const user = useAuthenticatedUser()
  const { values, page, setFilter, setPage } = useListParams(['q', 'status', 'meus'] as const)
  const status = (['finalizado', 'cancelado', 'todos'].includes(values.status) ? values.status : 'aberto') as
    | AttendanceStatus
    | 'todos'
  const onlyMine = values.meus === '1'

  const { data, isPending, isError, isPlaceholderData } = useAttendances({
    q: values.q,
    status,
    veterinarianId: onlyMine ? user.id : undefined,
    page,
    pageSize: PAGE_SIZE,
  })
  const hasFilters = Boolean(values.q || status !== 'aberto' || onlyMine)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">Consultas, retornos, emergências e demais atendimentos.</p>
        <ButtonLink to="/atendimentos/novo">
          <Plus className="size-4" aria-hidden="true" />
          Novo atendimento
        </ButtonLink>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="grid items-center gap-3 border-b border-border p-4 sm:grid-cols-[1fr_auto_auto]">
          <SearchInput
            value={values.q}
            onChange={(q) => setFilter('q', q)}
            label="Buscar atendimentos"
            placeholder="Paciente, tutor, nº do atendimento ou prontuário"
          />
          <Select
            aria-label="Filtrar por situação"
            value={status}
            onChange={(e) => setFilter('status', e.target.value === 'aberto' ? '' : e.target.value)}
          >
            <option value="aberto">Em andamento</option>
            <option value="finalizado">Finalizados</option>
            <option value="cancelado">Cancelados</option>
            <option value="todos">Todos</option>
          </Select>
          {user.role !== 'recepcao' && (
            <Checkbox
              label="Só os meus"
              checked={onlyMine}
              onChange={(e) => setFilter('meus', e.target.checked ? '1' : '')}
              className="py-0"
            />
          )}
        </div>

        {isPending ? (
          <LoadingState label="Carregando atendimentos..." />
        ) : isError ? (
          <ErrorState message="Não foi possível carregar os atendimentos." />
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={Stethoscope}
            title={hasFilters ? 'Nenhum atendimento encontrado' : 'Nenhum atendimento em andamento'}
            description={hasFilters ? 'Tente outro termo ou ajuste os filtros.' : 'Abra um atendimento para começar.'}
          />
        ) : (
          <div className={isPlaceholderData ? 'opacity-60 transition-opacity' : ''}>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Paciente
                  </th>
                  <th scope="col" className="hidden px-4 py-3 font-semibold md:table-cell">
                    Veterinário
                  </th>
                  <th scope="col" className="hidden px-4 py-3 font-semibold sm:table-cell">
                    Início
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    Situação
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((a) => (
                  <tr key={a.id} className="relative transition-colors duration-150 hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <p className="flex flex-wrap items-baseline gap-x-2">
                        {/* O link cobre a linha inteira (after:absolute) */}
                        <Link
                          to={`/atendimentos/${a.id}`}
                          className="font-medium after:absolute after:inset-0 hover:text-primary"
                        >
                          {a.patient.name}
                        </Link>
                        <span className="font-mono text-xs text-muted-foreground">
                          nº {formatRecordCode(a.patient.code)}
                        </span>
                      </p>
                      <p className="text-muted-foreground">
                        {KIND_LABELS[a.kind]} · Tutor: {a.patient.tutor.name}
                      </p>
                      {(a.diagnosis || a.chiefComplaint) && (
                        <p className="line-clamp-1 text-muted-foreground">{a.diagnosis ?? a.chiefComplaint}</p>
                      )}
                      <p className="font-mono text-xs text-muted-foreground sm:hidden">
                        {dateTime.format(new Date(a.startedAt))}
                      </p>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">{a.veterinarian.name}</td>
                    <td className="hidden whitespace-nowrap px-4 py-3 sm:table-cell">
                      <span className="font-mono text-xs">{dateTime.format(new Date(a.startedAt))}</span>
                      <span className="block font-mono text-xs text-muted-foreground">
                        Atd. {formatAttendanceCode(a.code)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <StatusBadge status={a.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  )
}
