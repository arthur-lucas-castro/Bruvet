import { CircleCheck, CircleX, RotateCcw, TriangleAlert } from 'lucide-react'
import { useCallback, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { Field, Textarea } from '../../components/ui/Field'
import { PageHeader } from '../../components/ui/PageHeader'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { ApiError } from '../../lib/api'
import { formatAge, formatPhone, formatRecordCode, formatWeight } from '../../lib/format'
import { useAuthenticatedUser } from '../auth/auth-api'
import { PatientAvatar } from '../patients/PatientRow'
import { SEX_LABELS, SIZE_LABELS, SPECIES_LABELS } from '../patients/species'
import { useAttendance, useAttendanceAction, type AttendanceDetail } from './attendances-api'
import { ClinicalForm } from './ClinicalForm'
import { KIND_LABELS, formatAttendanceCode } from './constants'
import { MedicationsSection } from './MedicationsSection'
import { NotesSection } from './NotesSection'
import { ProceduresSection } from './ProceduresSection'
import { StatusBadge } from './StatusBadge'

const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

export function AttendancePage() {
  const { id } = useParams()
  const { data: attendance, isPending, error } = useAttendance(id)

  if (isPending) return <LoadingState />
  if (error) {
    return (
      <ErrorState
        message={error instanceof ApiError && error.status === 404 ? 'Atendimento não encontrado.' : undefined}
      />
    )
  }
  return <AttendanceView attendance={attendance} />
}

function AttendanceView({ attendance }: { attendance: AttendanceDetail }) {
  const user = useAuthenticatedUser()
  const isClinical = user.role === 'admin' || user.role === 'veterinario'
  const isOpen = attendance.status === 'aberto'
  const editable = isClinical && isOpen
  const action = useAttendanceAction(attendance.id)
  const [dirty, setDirty] = useState(false)
  const [dialog, setDialog] = useState<'finish' | 'cancel' | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const onDirtyChange = useCallback((value: boolean) => setDirty(value), [])

  async function run(kind: 'finish' | 'cancel' | 'reopen', reason?: string) {
    setActionError(null)
    try {
      await action.mutateAsync({ action: kind, reason })
      setDialog(null)
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Não foi possível concluir a ação.')
      setDialog(null)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        backTo={{ to: '/atendimentos', label: 'Atendimentos' }}
        title={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {KIND_LABELS[attendance.kind]}
            <StatusBadge status={attendance.status} />
          </span>
        }
        subtitle={
          <span className="font-mono">
            Atd. nº {formatAttendanceCode(attendance.code)} · início {dateTime.format(new Date(attendance.startedAt))}
            {attendance.finishedAt &&
              ` · ${attendance.status === 'cancelado' ? 'cancelado' : 'finalizado'} ${dateTime.format(new Date(attendance.finishedAt))}`}
          </span>
        }
        actions={
          <>
            {editable && (
              <>
                <Button variant="secondary" onClick={() => setDialog('cancel')}>
                  <CircleX className="size-4" aria-hidden="true" />
                  Cancelar
                </Button>
                <Button
                  onClick={() => setDialog('finish')}
                  disabled={dirty}
                  title={dirty ? 'Salve a ficha antes de finalizar' : undefined}
                >
                  <CircleCheck className="size-4" aria-hidden="true" />
                  Finalizar
                </Button>
              </>
            )}
            {user.role === 'admin' && attendance.status === 'finalizado' && (
              <Button variant="secondary" onClick={() => run('reopen')} loading={action.isPending}>
                <RotateCcw className="size-4" aria-hidden="true" />
                Reabrir
              </Button>
            )}
          </>
        }
      />

      {actionError && <Alert>{actionError}</Alert>}
      {dirty && editable && (
        <p className="text-sm text-muted-foreground">Salve a ficha clínica para poder finalizar o atendimento.</p>
      )}
      {attendance.status === 'cancelado' && attendance.cancelReason && (
        <Alert variant="info">Cancelado: {attendance.cancelReason}</Alert>
      )}
      {attendance.status === 'finalizado' && isClinical && (
        <Alert variant="info">
          Atendimento finalizado: a ficha está travada. Informações novas entram como adendo na evolução.
        </Alert>
      )}

      <PatientBanner attendance={attendance} />

      <div className="grid items-start gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <ClinicalForm
            key={attendance.id}
            attendance={attendance}
            readOnly={!editable}
            onDirtyChange={onDirtyChange}
          />
          <NotesSection attendance={attendance} canWrite={isClinical} />
        </div>
        <div className="space-y-5 lg:sticky lg:top-20">
          <ProceduresSection attendance={attendance} editable={editable} />
          <MedicationsSection attendance={attendance} editable={editable} />
          <p className="text-xs text-muted-foreground">
            Aberto por {attendance.createdBy.name}. Responsável: {attendance.veterinarian.name}
            {attendance.veterinarian.crmv && ` (${attendance.veterinarian.crmv})`}.
          </p>
        </div>
      </div>

      <Dialog
        open={dialog === 'finish'}
        onClose={() => setDialog(null)}
        title="Finalizar atendimento"
        description="A ficha clínica, os procedimentos e os medicamentos ficam travados. Depois disso, só é possível adicionar adendos."
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setDialog(null)}>
            Voltar
          </Button>
          <Button onClick={() => run('finish')} loading={action.isPending}>
            Finalizar atendimento
          </Button>
        </div>
      </Dialog>

      <CancelDialog
        open={dialog === 'cancel'}
        onClose={() => setDialog(null)}
        loading={action.isPending}
        onConfirm={(reason) => run('cancel', reason)}
      />
    </div>
  )
}

/** Resumo do paciente no topo do atendimento, com alergias em destaque. */
function PatientBanner({ attendance }: { attendance: AttendanceDetail }) {
  const { patient } = attendance
  const details = [
    SPECIES_LABELS[patient.species],
    patient.breed,
    SEX_LABELS[patient.sex],
    patient.size && `porte ${SIZE_LABELS[patient.size].toLowerCase()}`,
    formatAge(patient.birthDate),
    patient.weightKg != null && formatWeight(patient.weightKg),
  ].filter(Boolean)

  return (
    <section aria-label="Paciente" className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <PatientAvatar species={patient.species} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <Link to={`/pacientes/${patient.id}`} className="text-lg font-semibold hover:text-primary">
              {patient.name}
            </Link>
            <span className="font-mono text-xs text-muted-foreground">prontuário {formatRecordCode(patient.code)}</span>
          </p>
          <p className="text-sm text-muted-foreground">{details.join(' · ')}</p>
          <p className="text-sm">
            Tutor:{' '}
            <Link to={`/tutores/${patient.tutor.id}`} className="hover:text-primary">
              {patient.tutor.name}
            </Link>{' '}
            ·{' '}
            <a href={`tel:${patient.tutor.phone}`} className="font-mono hover:text-primary">
              {formatPhone(patient.tutor.phone)}
            </a>
          </p>
        </div>
      </div>
      {(patient.allergies || patient.chronicConditions) && (
        <div className="mt-3 space-y-2">
          {patient.allergies && (
            <p
              role="note"
              className="flex items-start gap-2 rounded-lg border border-accent/40 bg-orange-50 px-3 py-2 text-sm text-orange-900"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
              <span>
                <span className="font-semibold">Alergias:</span> {patient.allergies}
              </span>
            </p>
          )}
          {patient.chronicConditions && (
            <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm">
              <span className="font-semibold">Condições crônicas:</span> {patient.chronicConditions}
            </p>
          )}
        </div>
      )}
    </section>
  )
}

function CancelDialog({
  open,
  onClose,
  loading,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  loading: boolean
  onConfirm: (reason: string) => void
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Cancelar atendimento"
      description="Só é possível cancelar sem procedimentos lançados e com os medicamentos estornados."
    >
      <CancelForm onClose={onClose} loading={loading} onConfirm={onConfirm} />
    </Dialog>
  )
}

function CancelForm({
  onClose,
  loading,
  onConfirm,
}: {
  onClose: () => void
  loading: boolean
  onConfirm: (reason: string) => void
}) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | undefined>()

  function submit(event: FormEvent) {
    event.preventDefault()
    if (reason.trim().length < 3) {
      setError('Informe o motivo')
      return
    }
    onConfirm(reason.trim())
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Motivo do cancelamento" error={error}>
        {(a11y) => (
          <Textarea {...a11y} value={reason} onChange={(e) => setReason(e.target.value)} rows={2} autoFocus />
        )}
      </Field>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>
          Voltar
        </Button>
        <Button type="submit" variant="danger" loading={loading}>
          Cancelar atendimento
        </Button>
      </div>
    </form>
  )
}
