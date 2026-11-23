import { CalendarClock, CalendarX2, PackageMinus, Pill, Plus, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Field'
import { Pagination } from '../../components/ui/Pagination'
import { SearchInput } from '../../components/ui/SearchInput'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { formatDate } from '../../lib/format'
import { useListParams } from '../../lib/use-list-params'
import { useAuthenticatedUser } from '../auth/auth-api'
import { MedicationFormDialog } from './MedicationFormDialog'
import { StockBadges } from './StockBadges'
import { useMedications, useStockAlerts, type ActiveFilter, type StockFilter } from './stock-api'
import { EXPIRY_WARNING_DAYS, formatQuantity } from './units'

const PAGE_SIZE = 25
const STATUS_FILTERS: StockFilter[] = ['todos', 'baixo', 'vencendo', 'vencido']

export function StockPage() {
  const user = useAuthenticatedUser()
  const canManage = user.role === 'admin' || user.role === 'veterinario'
  const { values, page, setFilter, setPage } = useListParams(['q', 'status', 'situacao'] as const)
  const status = (STATUS_FILTERS as string[]).includes(values.status)
    ? (values.status as StockFilter)
    : 'todos'
  const situacao = (['inativos', 'todos'].includes(values.situacao) ? values.situacao : 'ativos') as ActiveFilter

  const { data, isPending, isError, isPlaceholderData } = useMedications({
    q: values.q,
    status,
    situacao,
    page,
    pageSize: PAGE_SIZE,
  })
  const { data: alerts } = useStockAlerts()
  const [formOpen, setFormOpen] = useState(false)
  const hasFilters = Boolean(values.q || status !== 'todos' || situacao !== 'ativos')

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {canManage
            ? 'Medicamentos, lotes e movimentações.'
            : 'Consulte o estoque. Movimentações são feitas por veterinários e administradores.'}
        </p>
        {canManage && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Novo medicamento
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <AlertTile
          icon={PackageMinus}
          label="Abaixo do mínimo"
          count={alerts?.lowStock.length}
          active={status === 'baixo'}
          onClick={() => setFilter('status', status === 'baixo' ? '' : 'baixo')}
        />
        <AlertTile
          icon={CalendarClock}
          label={`Lotes vencendo em ${EXPIRY_WARNING_DAYS} dias`}
          count={alerts?.expiring.length}
          active={status === 'vencendo'}
          onClick={() => setFilter('status', status === 'vencendo' ? '' : 'vencendo')}
        />
        <AlertTile
          icon={CalendarX2}
          label="Lotes vencidos com saldo"
          count={alerts?.expired.length}
          tone="danger"
          active={status === 'vencido'}
          onClick={() => setFilter('status', status === 'vencido' ? '' : 'vencido')}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="grid gap-3 border-b border-border p-4 sm:grid-cols-[1fr_auto_auto]">
          <SearchInput
            value={values.q}
            onChange={(q) => setFilter('q', q)}
            label="Buscar medicamentos"
            placeholder="Nome, princípio ativo ou fabricante"
          />
          <Select
            aria-label="Filtrar pela situação do estoque"
            value={status}
            onChange={(e) => setFilter('status', e.target.value === 'todos' ? '' : e.target.value)}
          >
            <option value="todos">Todas as situações</option>
            <option value="baixo">Estoque baixo ou zerado</option>
            <option value="vencendo">Com lote vencendo</option>
            <option value="vencido">Com lote vencido</option>
          </Select>
          <Select
            aria-label="Filtrar por cadastro ativo"
            value={situacao}
            onChange={(e) => setFilter('situacao', e.target.value === 'ativos' ? '' : e.target.value)}
          >
            <option value="ativos">Ativos</option>
            <option value="inativos">Inativos</option>
            <option value="todos">Todos</option>
          </Select>
        </div>

        {isPending ? (
          <LoadingState label="Carregando estoque..." />
        ) : isError ? (
          <ErrorState message="Não foi possível carregar o estoque." />
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={Pill}
            title={hasFilters ? 'Nenhum medicamento encontrado' : 'Nenhum medicamento cadastrado'}
            description={
              hasFilters
                ? 'Tente outro termo ou ajuste os filtros.'
                : canManage
                  ? 'Cadastre os medicamentos e registre as entradas de estoque.'
                  : undefined
            }
          />
        ) : (
          <div className={isPlaceholderData ? 'opacity-60 transition-opacity' : ''}>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Medicamento
                  </th>
                  <th scope="col" className="hidden px-4 py-3 font-semibold md:table-cell">
                    Próxima validade
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    Disponível
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((medication) => (
                  <tr
                    key={medication.id}
                    className={`relative transition-colors duration-150 hover:bg-muted/40 ${
                      medication.active ? '' : 'text-muted-foreground'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        {/* O link cobre a linha inteira (after:absolute) */}
                        <Link
                          to={`/estoque/${medication.id}`}
                          className="font-medium after:absolute after:inset-0 hover:text-primary"
                        >
                          {medication.name}
                        </Link>
                        {medication.controlled && <Badge tone="primary">Controlado</Badge>}
                        {!medication.active && <Badge>Inativo</Badge>}
                      </p>
                      <p className="text-muted-foreground">
                        {[medication.activeIngredient, medication.concentration, medication.presentation]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      <div className="mt-1">
                        <StockBadges stock={medication.stock} />
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      {medication.stock.nextExpiry ? (
                        formatDate(medication.stock.nextExpiry)
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <span className="font-mono font-medium">
                        {formatQuantity(medication.stock.available, medication.unit)}
                      </span>
                      {medication.minStock > 0 && (
                        <span className="block text-xs text-muted-foreground">
                          mín. {formatQuantity(medication.minStock, medication.unit)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
          </div>
        )}
      </div>

      {canManage && <MedicationFormDialog open={formOpen} onClose={() => setFormOpen(false)} />}
    </div>
  )
}

type AlertTileProps = {
  icon: LucideIcon
  label: string
  count: number | undefined
  active: boolean
  tone?: 'warning' | 'danger'
  onClick: () => void
}

/** Indicador de alerta que também funciona como atalho para o filtro correspondente. */
function AlertTile({ icon: Icon, label, count, active, tone = 'warning', onClick }: AlertTileProps) {
  const hasItems = Boolean(count)
  const color = !hasItems
    ? 'text-muted-foreground'
    : tone === 'danger'
      ? 'text-destructive'
      : 'text-accent'

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition-colors duration-150 hover:border-primary ${
        active ? 'border-primary ring-2 ring-primary/20' : 'border-border'
      }`}
    >
      <Icon className={`size-6 shrink-0 ${color}`} aria-hidden="true" />
      <span className="min-w-0">
        <span className={`block font-mono text-2xl font-semibold ${hasItems ? 'text-foreground' : 'text-muted-foreground'}`}>
          {count ?? '–'}
        </span>
        <span className="block text-sm text-muted-foreground">{label}</span>
      </span>
    </button>
  )
}
