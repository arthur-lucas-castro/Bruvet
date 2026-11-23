import { PawPrint, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '../../components/ui/Badge'
import { ButtonLink } from '../../components/ui/ButtonLink'
import { Select } from '../../components/ui/Field'
import { Pagination } from '../../components/ui/Pagination'
import { SearchInput } from '../../components/ui/SearchInput'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { formatAge, formatPhone, formatRecordCode } from '../../lib/format'
import { useListParams } from '../../lib/use-list-params'
import { PatientAvatar } from './PatientRow'
import { usePatients, type PatientStatus } from './patients-api'
import { SPECIES, SPECIES_LABELS, type Species } from './species'

const PAGE_SIZE = 20

export function PatientsPage() {
  const { values, page, setFilter, setPage } = useListParams(['q', 'species', 'status'] as const)
  const species = (SPECIES as readonly string[]).includes(values.species)
    ? (values.species as Species)
    : undefined
  const status = (['ativos', 'obitos', 'todos'].includes(values.status) ? values.status : 'ativos') as PatientStatus

  const { data, isPending, isError, isPlaceholderData } = usePatients({
    q: values.q,
    species,
    status,
    page,
    pageSize: PAGE_SIZE,
  })

  const hasFilters = Boolean(values.q || species || status !== 'ativos')

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">Animais atendidos pelo hospital.</p>
        <ButtonLink to="/pacientes/novo">
          <Plus className="size-4" aria-hidden="true" />
          Novo paciente
        </ButtonLink>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="grid gap-3 border-b border-border p-4 sm:grid-cols-[1fr_auto_auto]">
          <SearchInput
            value={values.q}
            onChange={(q) => setFilter('q', q)}
            label="Buscar pacientes"
            placeholder="Nome, prontuário, microchip ou tutor"
          />
          <Select
            aria-label="Filtrar por espécie"
            value={species ?? ''}
            onChange={(e) => setFilter('species', e.target.value)}
          >
            <option value="">Todas as espécies</option>
            {SPECIES.map((s) => (
              <option key={s} value={s}>
                {SPECIES_LABELS[s]}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filtrar por situação"
            value={status}
            onChange={(e) => setFilter('status', e.target.value === 'ativos' ? '' : e.target.value)}
          >
            <option value="ativos">Ativos</option>
            <option value="obitos">Óbitos</option>
            <option value="todos">Todos</option>
          </Select>
        </div>

        {isPending ? (
          <LoadingState label="Carregando pacientes..." />
        ) : isError ? (
          <ErrorState message="Não foi possível carregar os pacientes." />
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={PawPrint}
            title={hasFilters ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
            description={
              hasFilters
                ? 'Tente outro termo ou ajuste os filtros.'
                : 'Cadastre o primeiro paciente do hospital.'
            }
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
                    Tutor
                  </th>
                  <th scope="col" className="hidden px-4 py-3 font-semibold lg:table-cell">
                    Idade
                  </th>
                  <th scope="col" className="hidden px-4 py-3 text-right font-semibold sm:table-cell">
                    Prontuário
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((patient) => (
                  <tr key={patient.id} className="relative transition-colors duration-150 hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <PatientAvatar species={patient.species} muted={Boolean(patient.deceasedAt)} />
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-x-2">
                            {/* O link cobre a linha inteira (after:absolute) */}
                            <Link
                              to={`/pacientes/${patient.id}`}
                              className="font-medium after:absolute after:inset-0 hover:text-primary"
                            >
                              {patient.name}
                            </Link>
                            {patient.deceasedAt && <Badge>Óbito</Badge>}
                          </p>
                          <p className="text-muted-foreground">
                            {[SPECIES_LABELS[patient.species], patient.breed].filter(Boolean).join(' · ')}
                          </p>
                          {/* No celular, o tutor aparece abaixo */}
                          <p className="text-muted-foreground md:hidden">Tutor: {patient.tutor.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <p>{patient.tutor.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {formatPhone(patient.tutor.phone)}
                      </p>
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      {formatAge(patient.birthDate, patient.deceasedAt) || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 text-right font-mono text-xs sm:table-cell">
                      {formatRecordCode(patient.code)}
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
