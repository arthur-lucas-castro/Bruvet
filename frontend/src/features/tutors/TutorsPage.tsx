import { Plus, UserRoundSearch } from 'lucide-react'
import { Link } from 'react-router'
import { ButtonLink } from '../../components/ui/ButtonLink'
import { Pagination } from '../../components/ui/Pagination'
import { SearchInput } from '../../components/ui/SearchInput'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { formatCpf, formatPhone } from '../../lib/format'
import { useListParams } from '../../lib/use-list-params'
import { useTutors } from './tutors-api'

const PAGE_SIZE = 20

export function TutorsPage() {
  const { values, page, setFilter, setPage } = useListParams(['q'] as const)
  const { data, isPending, isError, isPlaceholderData } = useTutors({
    q: values.q,
    page,
    pageSize: PAGE_SIZE,
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">Responsáveis pelos pacientes.</p>
        <ButtonLink to="/tutores/novo">
          <Plus className="size-4" aria-hidden="true" />
          Novo tutor
        </ButtonLink>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <SearchInput
            value={values.q}
            onChange={(q) => setFilter('q', q)}
            label="Buscar tutores"
            placeholder="Nome, CPF, telefone ou nome do animal"
          />
        </div>

        {isPending ? (
          <LoadingState label="Carregando tutores..." />
        ) : isError ? (
          <ErrorState message="Não foi possível carregar os tutores." />
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={UserRoundSearch}
            title={values.q ? 'Nenhum tutor encontrado' : 'Nenhum tutor cadastrado'}
            description={
              values.q ? 'Confira a grafia ou busque por CPF ou telefone.' : 'Cadastre o primeiro tutor.'
            }
          />
        ) : (
          <div className={isPlaceholderData ? 'opacity-60 transition-opacity' : ''}>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Tutor
                  </th>
                  <th scope="col" className="hidden px-4 py-3 font-semibold md:table-cell">
                    CPF
                  </th>
                  <th scope="col" className="hidden px-4 py-3 font-semibold lg:table-cell">
                    Pacientes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((tutor) => (
                  <tr key={tutor.id} className="relative transition-colors duration-150 hover:bg-muted/40">
                    <td className="px-4 py-3">
                      {/* O link cobre a linha inteira (after:absolute) */}
                      <Link
                        to={`/tutores/${tutor.id}`}
                        className="font-medium after:absolute after:inset-0 hover:text-primary"
                      >
                        {tutor.name}
                      </Link>
                      <p className="font-mono text-xs text-muted-foreground">
                        {formatPhone(tutor.phone)}
                      </p>
                    </td>
                    <td className="hidden px-4 py-3 font-mono text-xs md:table-cell">
                      {tutor.cpf ? formatCpf(tutor.cpf) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      {tutor.patients.length ? (
                        <span className="text-muted-foreground">
                          {tutor.patients.map((p) => p.name).join(', ')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
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
    </div>
  )
}
