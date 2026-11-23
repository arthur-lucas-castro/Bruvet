import { ClipboardList, FolderCog, Plus, Printer } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Field'
import { SearchInput } from '../../components/ui/SearchInput'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { formatCurrency, formatDuration } from '../../lib/format'
import { useListParams } from '../../lib/use-list-params'
import { useAuthenticatedUser } from '../auth/auth-api'
import { variantLabel } from '../patients/species'
import { CategoriesDialog } from './CategoriesDialog'
import { ProcedureFormDialog } from './ProcedureFormDialog'
import {
  useProcedureCategories,
  useProcedures,
  type Procedure,
  type ProcedureStatus,
} from './procedures-api'

type FormState = { open: false } | { open: true; procedureId?: string }

/** Agrupa a lista (já ordenada pela API) por categoria. */
function groupByCategory(items: Procedure[]) {
  const groups: { category: Procedure['category']; items: Procedure[] }[] = []
  for (const item of items) {
    const last = groups.at(-1)
    if (last && last.category.id === item.categoryId) last.items.push(item)
    else groups.push({ category: item.category, items: [item] })
  }
  return groups
}

export function ProceduresPage() {
  const user = useAuthenticatedUser()
  const isAdmin = user.role === 'admin'
  const { values, setFilter } = useListParams(['q', 'categoria', 'status'] as const)
  const status: ProcedureStatus =
    isAdmin && ['inativos', 'todos'].includes(values.status)
      ? (values.status as ProcedureStatus)
      : 'ativos'

  const { data: categories } = useProcedureCategories()
  const { data, isPending, isError, isPlaceholderData } = useProcedures({
    q: values.q,
    categoryId: values.categoria,
    status,
  })

  const [form, setForm] = useState<FormState>({ open: false })
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const hasFilters = Boolean(values.q || values.categoria || status !== 'ativos')
  const groups = data ? groupByCategory(data.items) : []
  const [today] = useState(() => new Intl.DateTimeFormat('pt-BR').format(new Date()))

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <p className="text-sm text-muted-foreground">
          {isAdmin
            ? 'Procedimentos oferecidos e seus valores.'
            : 'Consulte os procedimentos e valores. Alterações são feitas pela administração.'}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="size-4" aria-hidden="true" />
            Imprimir
          </Button>
          {isAdmin && (
            <>
              <Button variant="secondary" onClick={() => setCategoriesOpen(true)}>
                <FolderCog className="size-4" aria-hidden="true" />
                Categorias
              </Button>
              <Button onClick={() => setForm({ open: true })}>
                <Plus className="size-4" aria-hidden="true" />
                Novo procedimento
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Cabeçalho que só aparece na impressão */}
      <div className="hidden print:block">
        <h1 className="text-xl font-bold">Tabela de procedimentos — Bruvet</h1>
        <p className="text-sm">Valores vigentes em {today}</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card print:border-0">
        <div
          className={`grid gap-3 border-b border-border p-4 print:hidden ${
            isAdmin ? 'sm:grid-cols-[1fr_auto_auto]' : 'sm:grid-cols-[1fr_auto]'
          }`}
        >
          <SearchInput
            value={values.q}
            onChange={(q) => setFilter('q', q)}
            label="Buscar procedimentos"
            placeholder="Nome, código ou descrição"
          />
          <Select
            aria-label="Filtrar por categoria"
            value={values.categoria}
            onChange={(e) => setFilter('categoria', e.target.value)}
          >
            <option value="">Todas as categorias</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          {isAdmin && (
            <Select
              aria-label="Filtrar por situação"
              value={status}
              onChange={(e) => setFilter('status', e.target.value === 'ativos' ? '' : e.target.value)}
            >
              <option value="ativos">Ativos</option>
              <option value="inativos">Inativos</option>
              <option value="todos">Todos</option>
            </Select>
          )}
        </div>

        {isPending ? (
          <LoadingState label="Carregando catálogo..." />
        ) : isError ? (
          <ErrorState message="Não foi possível carregar o catálogo." />
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={hasFilters ? 'Nenhum procedimento encontrado' : 'Catálogo vazio'}
            description={
              hasFilters
                ? 'Tente outro termo ou ajuste os filtros.'
                : isAdmin
                  ? 'Cadastre os procedimentos e valores do hospital.'
                  : 'A administração ainda não cadastrou procedimentos.'
            }
          />
        ) : (
          <table className={`w-full text-left text-sm ${isPlaceholderData ? 'opacity-60' : ''}`}>
            <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Procedimento
                </th>
                <th scope="col" className="hidden px-4 py-3 font-semibold sm:table-cell print:table-cell">
                  Duração
                </th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">
                  Valor
                </th>
              </tr>
            </thead>
            {groups.map((group) => (
                <tbody key={group.category.id} className="break-inside-avoid">
                  <tr className="border-b border-border bg-muted/30">
                    <th
                      scope="colgroup"
                      colSpan={3}
                      className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-primary"
                    >
                      {group.category.name}
                    </th>
                  </tr>
                  {group.items.map((procedure) => (
                    <ProcedureRow
                      key={procedure.id}
                      procedure={procedure}
                      onEdit={isAdmin ? () => setForm({ open: true, procedureId: procedure.id }) : undefined}
                    />
                  ))}
                </tbody>
            ))}
          </table>
        )}
      </div>

      {isAdmin && (
        <>
          <ProcedureFormDialog
            open={form.open}
            procedureId={form.open ? form.procedureId : undefined}
            defaultCategoryId={values.categoria || undefined}
            onClose={() => setForm({ open: false })}
          />
          <CategoriesDialog open={categoriesOpen} onClose={() => setCategoriesOpen(false)} />
        </>
      )}
    </div>
  )
}

function ProcedureRow({ procedure, onEdit }: { procedure: Procedure; onEdit?: () => void }) {
  const duration = formatDuration(procedure.durationMinutes)

  return (
    <tr
      className={`relative border-b border-border last:border-0 ${
        onEdit ? 'transition-colors duration-150 hover:bg-muted/40' : ''
      } ${procedure.active ? '' : 'text-muted-foreground'}`}
    >
      <td className="px-4 py-3">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {onEdit ? (
            // O botão cobre a linha inteira (after:absolute) para facilitar o clique
            <button
              type="button"
              onClick={onEdit}
              className="text-left font-medium after:absolute after:inset-0 hover:text-primary"
            >
              {procedure.name}
            </button>
          ) : (
            <span className="font-medium">{procedure.name}</span>
          )}
          {procedure.code && (
            <span className="font-mono text-xs text-muted-foreground">{procedure.code}</span>
          )}
          {!procedure.active && <Badge>Inativo</Badge>}
        </p>
        {procedure.description && (
          <p className="mt-0.5 text-muted-foreground">{procedure.description}</p>
        )}
        {procedure.preparation && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            <span className="font-semibold">Preparo:</span> {procedure.preparation}
          </p>
        )}
        {duration && <p className="mt-0.5 text-xs text-muted-foreground sm:hidden print:hidden">{duration}</p>}
        {procedure.prices.length > 0 && (
          <ul aria-label="Variações de preço" className="mt-2 flex flex-wrap gap-1.5">
            {procedure.prices.map((variant) => (
              <li
                key={variant.id}
                className="inline-flex items-baseline gap-1.5 rounded-md border border-border bg-muted/50 px-2 py-0.5 text-xs"
              >
                <span>{variantLabel(variant.species, variant.size)}</span>
                <span className="font-mono font-medium text-foreground">
                  {formatCurrency(variant.priceCents)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </td>
      <td className="hidden whitespace-nowrap px-4 py-3 align-top text-muted-foreground sm:table-cell print:table-cell">
        {duration || '—'}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right align-top">
        <span className="font-mono font-medium">{formatCurrency(procedure.priceCents)}</span>
        {procedure.prices.length > 0 && (
          <span className="block text-xs text-muted-foreground">padrão</span>
        )}
      </td>
    </tr>
  )
}
