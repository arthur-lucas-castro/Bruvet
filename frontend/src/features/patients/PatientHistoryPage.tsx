import { History, Printer } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Field, Input } from '../../components/ui/Field'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { ApiError } from '../../lib/api'
import { formatInstantDate, formatRecordCode, localDayStartIso } from '../../lib/format'
import { useListParams } from '../../lib/use-list-params'
import { KIND_LABELS } from '../attendances/constants'
import { formatQuantity } from '../stock/units'
import { useHistoryEvents, useHistorySummary, type HistoryType } from './history-api'
import { HistoryTimeline } from './HistoryTimeline'
import { usePatient } from './patients-api'
import { WeightChart } from './WeightChart'

const TYPE_OPTIONS: { value: HistoryType; label: string }[] = [
  { value: 'todos', label: 'Tudo' },
  { value: 'atendimentos', label: 'Atendimentos' },
  { value: 'medicamentos', label: 'Medicamentos' },
  { value: 'pesos', label: 'Pesagens' },
]

export function PatientHistoryPage() {
  const { id = '' } = useParams()
  const { data: patient, isPending, error } = usePatient(id)

  if (isPending) return <LoadingState />
  if (error) {
    return (
      <ErrorState message={error instanceof ApiError && error.status === 404 ? 'Paciente não encontrado.' : undefined} />
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        backTo={{ to: `/pacientes/${patient.id}`, label: patient.name }}
        title={`Histórico de ${patient.name}`}
        subtitle={
          <span>
            <span className="font-mono">Prontuário nº {formatRecordCode(patient.code)}</span> · Tutor:{' '}
            {patient.tutor.name}
          </span>
        }
        actions={
          <Button variant="secondary" onClick={() => window.print()} className="print:hidden">
            <Printer className="size-4" aria-hidden="true" />
            Imprimir
          </Button>
        }
      />

      <SummarySection patientId={patient.id} />
      <TimelineSection patientId={patient.id} />
    </div>
  )
}

function SummarySection({ patientId }: { patientId: string }) {
  const { data, isPending, isError } = useHistorySummary(patientId)

  if (isPending) return <LoadingState label="Carregando resumo..." />
  if (isError) return <ErrorState message="Não foi possível carregar o resumo." />

  const { attendances } = data

  return (
    <div className="grid items-start gap-5 lg:grid-cols-3">
      <Card title="Peso (kg)" className="lg:col-span-2">
        <WeightChart points={data.weights} />
      </Card>

      <Card title="Resumo">
        <dl className="grid grid-cols-3 gap-3 text-center">
          {[
            ['Finalizados', attendances.finished],
            ['Em andamento', attendances.open],
            ['Cancelados', attendances.cancelled],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-muted/50 px-2 py-3">
              <dd className="font-mono text-xl font-semibold">{value}</dd>
              <dt className="text-xs text-muted-foreground">{label}</dt>
            </div>
          ))}
        </dl>
        {attendances.last && (
          <p className="mt-4 text-sm">
            <span className="text-muted-foreground">Último atendimento: </span>
            <Link to={`/atendimentos/${attendances.last.id}`} className="font-medium hover:text-primary">
              {KIND_LABELS[attendances.last.kind]} em {formatInstantDate(attendances.last.startedAt)}
            </Link>
            {attendances.last.diagnosis && (
              <span className="block text-muted-foreground">{attendances.last.diagnosis}</span>
            )}
          </p>
        )}
      </Card>

      <Card title="Vacinas aplicadas">
        {data.vaccines.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma vacina lançada em atendimentos (procedimentos da categoria Vacinas).
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {data.vaccines.map((v) => (
              <li key={v.id} className="flex items-baseline justify-between gap-3">
                <Link to={`/atendimentos/${v.attendanceId}`} className="font-medium hover:text-primary">
                  {v.name}
                </Link>
                <span className="font-mono text-xs text-muted-foreground">{formatInstantDate(v.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Medicamentos administrados" className="lg:col-span-2">
        {data.medications.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum medicamento registrado para este paciente.</p>
        ) : (
          <div className="-mx-5 -my-5">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-5 py-2.5 font-semibold">
                    Medicamento
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                    Vezes
                  </th>
                  <th scope="col" className="hidden px-3 py-2.5 text-right font-semibold sm:table-cell">
                    Total
                  </th>
                  <th scope="col" className="px-5 py-2.5 text-right font-semibold">
                    Última vez
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.medications.map((m) => (
                  <tr key={m.medication.id}>
                    <td className="px-5 py-2.5 font-medium">{m.medication.name}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{m.times}</td>
                    <td className="hidden px-3 py-2.5 text-right font-mono sm:table-cell">
                      {formatQuantity(m.totalQuantity, m.medication.unit)}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono text-xs">{formatInstantDate(m.lastAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

function TimelineSection({ patientId }: { patientId: string }) {
  const { values, setFilter, setFilters } = useListParams(['tipo', 'de', 'ate'] as const)
  const type = (TYPE_OPTIONS.some((o) => o.value === values.tipo) ? values.tipo : 'todos') as HistoryType
  const periodError = values.de && values.ate && values.de > values.ate

  const { data, isPending, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useHistoryEvents(patientId, {
    type,
    // As datas escolhidas são dias do calendário local: o fim inclui o dia inteiro
    from: values.de && !periodError ? localDayStartIso(values.de) : undefined,
    until: values.ate && !periodError ? localDayStartIso(values.ate, 1) : undefined,
  })

  const events = data?.pages.flatMap((p) => p.items) ?? []
  const total = data?.pages[0]?.total ?? 0
  const hasFilters = type !== 'todos' || Boolean(values.de || values.ate)

  return (
    <section aria-labelledby="linha-do-tempo" className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between print:hidden">
        <div>
          <h2 id="linha-do-tempo" className="text-lg font-semibold">
            Linha do tempo
          </h2>
          <div role="group" aria-label="Tipo de evento" className="mt-2 flex flex-wrap gap-2">
            {TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={type === option.value}
                onClick={() => setFilter('tipo', option.value === 'todos' ? '' : option.value)}
                className={`min-h-11 rounded-full border px-4 text-sm font-medium transition-colors duration-150 ${
                  type === option.value
                    ? 'border-primary bg-primary text-on-primary'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="De" className="w-40">
            {(a11y) => <Input {...a11y} type="date" value={values.de} onChange={(e) => setFilter('de', e.target.value)} />}
          </Field>
          <Field label="Até" className="w-40" error={periodError ? 'Antes do início' : undefined}>
            {(a11y) => <Input {...a11y} type="date" value={values.ate} onChange={(e) => setFilter('ate', e.target.value)} />}
          </Field>
          {(values.de || values.ate) && (
            <Button variant="ghost" onClick={() => setFilters({ de: '', ate: '' })}>
              Limpar período
            </Button>
          )}
        </div>
      </div>
      <h2 className="hidden text-lg font-semibold print:block">Linha do tempo</h2>

      {isPending ? (
        <LoadingState label="Carregando linha do tempo..." />
      ) : isError ? (
        <ErrorState message="Não foi possível carregar a linha do tempo." />
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            icon={History}
            title={hasFilters ? 'Nada encontrado com estes filtros' : 'Sem eventos no histórico'}
            description={hasFilters ? 'Ajuste o tipo ou o período.' : undefined}
          />
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground print:hidden" aria-live="polite">
            Mostrando {events.length} de {total} eventos
          </p>
          <HistoryTimeline events={events} />
          {hasNextPage && (
            <div className="flex justify-center print:hidden">
              <Button variant="secondary" onClick={() => fetchNextPage()} loading={isFetchingNextPage}>
                Carregar mais
              </Button>
            </div>
          )}
          {hasNextPage && (
            <p className="hidden text-sm print:block">
              Impressão com os {events.length} eventos mais recentes de {total}.
            </p>
          )}
        </>
      )}
    </section>
  )
}
