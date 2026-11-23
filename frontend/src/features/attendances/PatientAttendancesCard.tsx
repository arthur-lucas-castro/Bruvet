import { ChevronRight, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { ButtonLink } from '../../components/ui/ButtonLink'
import { Card } from '../../components/ui/Card'
import { LoadingState } from '../../components/ui/States'
import { useAttendances } from './attendances-api'
import { KIND_LABELS } from './constants'
import { StatusBadge } from './StatusBadge'

const date = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' })
const LIMIT = 10

/** Últimos atendimentos do paciente, na ficha dele. */
export function PatientAttendancesCard({ patientId, canOpen }: { patientId: string; canOpen: boolean }) {
  const { data, isPending } = useAttendances({ patientId, status: 'todos', pageSize: LIMIT })

  return (
    <Card
      title="Atendimentos"
      actions={
        canOpen && (
          <ButtonLink to={`/atendimentos/novo?patientId=${patientId}`} className="min-h-9 px-3">
            <Plus className="size-4" aria-hidden="true" />
            Novo
          </ButtonLink>
        )
      }
    >
      {isPending ? (
        <LoadingState />
      ) : !data?.items.length ? (
        <p className="text-sm text-muted-foreground">Nenhum atendimento registrado.</p>
      ) : (
        <ul className="-mx-5 -my-5 divide-y divide-border">
          {data.items.map((a) => (
            <li key={a.id}>
              <Link
                to={`/atendimentos/${a.id}`}
                className="flex items-center gap-3 px-5 py-3 transition-colors duration-150 hover:bg-muted/40"
              >
                <time dateTime={a.startedAt} className="w-20 shrink-0 font-mono text-xs text-muted-foreground">
                  {date.format(new Date(a.startedAt))}
                </time>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {KIND_LABELS[a.kind]} <span className="font-normal text-muted-foreground">· {a.veterinarian.name}</span>
                  </p>
                  {(a.diagnosis || a.chiefComplaint) && (
                    <p className="truncate text-sm text-muted-foreground">{a.diagnosis ?? a.chiefComplaint}</p>
                  )}
                </div>
                <StatusBadge status={a.status} />
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            </li>
          ))}
          {data.total > LIMIT && (
            <li className="px-5 py-3 text-sm text-muted-foreground">
              Mostrando os {LIMIT} mais recentes de {data.total}.{' '}
              <Link to={`/pacientes/${patientId}/historico`} className="font-semibold text-primary hover:underline">
                Ver histórico completo
              </Link>
            </li>
          )}
        </ul>
      )}
    </Card>
  )
}
