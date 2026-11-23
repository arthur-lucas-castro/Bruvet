import { CalendarPlus, Cross, Pill, Scale, Stethoscope, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { StatusBadge } from '../attendances/StatusBadge'
import { KIND_LABELS, formatAttendanceCode } from '../attendances/constants'
import { formatCurrency, formatDate, formatInstantDateTime, formatWeight } from '../../lib/format'
import { formatQuantity } from '../stock/units'
import type { HistoryAttendance, HistoryEvent } from './history-api'

/** Linha do tempo: cada evento com ícone, data e conteúdo; linha vertical ligando os eventos. */
export function HistoryTimeline({ events }: { events: HistoryEvent[] }) {
  return (
    <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-5 before:top-2 before:w-px before:bg-border">
      {events.map((event) => (
        <TimelineItem key={eventKey(event)} event={event} />
      ))}
    </ol>
  )
}

function eventKey(event: HistoryEvent) {
  switch (event.type) {
    case 'atendimento':
      return `a-${event.attendance.id}`
    case 'medicamento':
      return `m-${event.movement.id}`
    case 'peso':
      return `p-${event.weight.id}`
    default:
      return event.type
  }
}

const ICONS: Record<HistoryEvent['type'], LucideIcon> = {
  atendimento: Stethoscope,
  medicamento: Pill,
  peso: Scale,
  cadastro: CalendarPlus,
  obito: Cross,
}

function TimelineItem({ event }: { event: HistoryEvent }) {
  const Icon = ICONS[event.type]
  const muted = event.type === 'atendimento' && event.attendance.status === 'cancelado'

  return (
    <li className="relative flex gap-4 break-inside-avoid">
      <span
        aria-hidden="true"
        className={`relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-4 border-background ${
          event.type === 'atendimento' && !muted ? 'bg-primary text-on-primary' : 'bg-muted text-muted-foreground'
        }`}
      >
        <Icon className="size-4" />
      </span>
      <div className={`min-w-0 flex-1 ${muted ? 'opacity-70' : ''}`}>
        <EventContent event={event} />
      </div>
    </li>
  )
}

function EventContent({ event }: { event: HistoryEvent }) {
  switch (event.type) {
    case 'atendimento':
      return <AttendanceEvent attendance={event.attendance} />
    case 'medicamento': {
      const m = event.movement
      return (
        <SimpleEvent at={formatInstantDateTime(event.at)} title={`Medicamento: ${m.medication.name}`}>
          <span className="font-mono">{formatQuantity(Math.abs(m.quantity), m.medication.unit)}</span> · lote{' '}
          <span className="font-mono">{m.batch.batchNumber}</span> · {m.user.name}
          {m.reason && <span className="block">{m.reason}</span>}
        </SimpleEvent>
      )
    }
    case 'peso':
      return (
        <SimpleEvent at={formatInstantDateTime(event.at)} title={`Pesagem: ${formatWeight(event.weight.weightKg)}`}>
          {event.weight.source === 'atendimento' ? 'Exame físico do atendimento' : 'Cadastro do paciente'}
          {event.weight.recordedBy && ` · ${event.weight.recordedBy.name}`}
        </SimpleEvent>
      )
    case 'cadastro':
      return <SimpleEvent at={formatInstantDateTime(event.at)} title="Paciente cadastrado no hospital" />
    case 'obito':
      // Data do óbito é "somente data": formatada sem converter fuso
      return <SimpleEvent at={formatDate(event.at)} title="Óbito registrado" />
  }
}

function SimpleEvent({ at, title, children }: { at: string; title: string; children?: ReactNode }) {
  return (
    <div className="pt-2">
      <p className="font-mono text-xs text-muted-foreground">{at}</p>
      <p className="text-sm font-medium">{title}</p>
      {children && <p className="text-sm text-muted-foreground">{children}</p>}
    </div>
  )
}

function AttendanceEvent({ attendance: a }: { attendance: HistoryAttendance }) {
  const vitals = [
    a.weightKg != null && formatWeight(a.weightKg),
    a.temperatureC != null && `${String(a.temperatureC).replace('.', ',')} °C`,
    a.heartRate != null && `FC ${a.heartRate} bpm`,
    a.respiratoryRate != null && `FR ${a.respiratoryRate} mpm`,
  ].filter(Boolean)

  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div>
          <p className="font-mono text-xs text-muted-foreground">
            {formatInstantDateTime(a.startedAt)} · atd. {formatAttendanceCode(a.code)}
          </p>
          <h3 className="flex flex-wrap items-center gap-2 font-semibold">
            {KIND_LABELS[a.kind]}
            <StatusBadge status={a.status} />
          </h3>
          <p className="text-sm text-muted-foreground">
            {a.veterinarian.name}
            {a.veterinarian.crmv && ` · ${a.veterinarian.crmv}`}
          </p>
        </div>
        <Link
          to={`/atendimentos/${a.id}`}
          className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline print:hidden"
        >
          Abrir atendimento
        </Link>
      </header>

      {a.status === 'cancelado' && a.cancelReason && (
        <p className="mt-2 text-sm text-muted-foreground">Cancelado: {a.cancelReason}</p>
      )}

      <dl className="mt-3 space-y-2 text-sm">
        {a.chiefComplaint && <Row label="Queixa">{a.chiefComplaint}</Row>}
        {a.diagnosis && <Row label="Diagnóstico">{a.diagnosis}</Row>}
        {a.treatmentPlan && <Row label="Conduta">{a.treatmentPlan}</Row>}
        {vitals.length > 0 && (
          <Row label="Sinais vitais">
            <span className="font-mono">{vitals.join(' · ')}</span>
          </Row>
        )}
        {a.procedures.length > 0 && (
          <Row label="Procedimentos">
            {a.procedures.map((p) => `${p.quantity > 1 ? `${p.quantity}× ` : ''}${p.name}`).join(', ')}
            <span className="text-muted-foreground"> · {formatCurrency(a.totalCents)}</span>
          </Row>
        )}
        {a.stockMovements.length > 0 && (
          <Row label="Medicamentos">
            {a.stockMovements
              .map((m) => `${m.medication.name} (${formatQuantity(Math.abs(m.quantity), m.medication.unit)})`)
              .join(', ')}
          </Row>
        )}
      </dl>

      {a.notes.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Evolução ({a.notes.length})
          </p>
          {a.notes.map((note) => (
            <p key={note.id} className="text-sm">
              <span className="font-mono text-xs text-muted-foreground">
                {formatInstantDateTime(note.createdAt)} · {note.author.name}:
              </span>{' '}
              <span className="whitespace-pre-line">{note.text}</span>
            </p>
          ))}
        </div>
      )}
    </article>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="sm:grid sm:grid-cols-[8rem_1fr] sm:gap-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:pt-0.5">{label}</dt>
      <dd className="whitespace-pre-line">{children}</dd>
    </div>
  )
}
