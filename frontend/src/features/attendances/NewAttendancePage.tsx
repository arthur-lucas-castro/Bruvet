import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Field, Select, Textarea } from '../../components/ui/Field'
import { PageHeader } from '../../components/ui/PageHeader'
import { LoadingState } from '../../components/ui/States'
import { ApiError } from '../../lib/api'
import { useAuthenticatedUser } from '../auth/auth-api'
import { PatientPicker, type PickedPatient } from '../patients/PatientPicker'
import { usePatient } from '../patients/patients-api'
import { useCreateAttendance, useVeterinarians } from './attendances-api'
import { ATTENDANCE_KINDS, KIND_LABELS, type AttendanceKind } from './constants'

/** Abertura de atendimento (/atendimentos/novo?patientId=). */
export function NewAttendancePage() {
  const [searchParams] = useSearchParams()
  const patientId = searchParams.get('patientId') ?? undefined
  const { data: patient, isPending } = usePatient(patientId)

  if (patientId && isPending) return <LoadingState />

  const initial: PickedPatient | null =
    patient && !patient.deceasedAt
      ? { id: patient.id, name: patient.name, code: patient.code, tutorName: patient.tutor.name }
      : null

  return <NewAttendanceForm key={initial?.id ?? 'novo'} initialPatient={initial} />
}

function NewAttendanceForm({ initialPatient }: { initialPatient: PickedPatient | null }) {
  const user = useAuthenticatedUser()
  const navigate = useNavigate()
  const { data: veterinarians } = useVeterinarians()
  const createAttendance = useCreateAttendance()

  const [patient, setPatient] = useState(initialPatient)
  const [kind, setKind] = useState<AttendanceKind>('consulta')
  // Quem é veterinário já aparece como responsável
  const [veterinarianId, setVeterinarianId] = useState(user.role === 'veterinario' ? user.id : '')
  const [chiefComplaint, setChiefComplaint] = useState('')
  const [errors, setErrors] = useState<{ patient?: string; vet?: string; form?: string }>({})

  async function submit(event: FormEvent) {
    event.preventDefault()
    const nextErrors = {
      patient: patient ? undefined : 'Selecione o paciente',
      vet: veterinarianId ? undefined : 'Selecione o veterinário responsável',
    }
    setErrors(nextErrors)
    if (!patient || !veterinarianId) return

    try {
      const created = await createAttendance.mutateAsync({
        patientId: patient.id,
        kind,
        veterinarianId,
        chiefComplaint: chiefComplaint.trim() || null,
      })
      navigate(`/atendimentos/${created.id}`, { replace: true })
    } catch (error) {
      setErrors({ form: error instanceof ApiError ? error.message : 'Não foi possível abrir o atendimento.' })
    }
  }

  return (
    <form onSubmit={submit} noValidate className="max-w-2xl space-y-5">
      <PageHeader backTo={{ to: '/atendimentos', label: 'Atendimentos' }} title="Novo atendimento" />

      {errors.form && <Alert>{errors.form}</Alert>}

      <Card>
        <div className="space-y-4">
          <div>
            <PatientPicker label="Paciente" value={patient} onChange={setPatient} />
            {errors.patient && <p className="mt-1.5 text-sm text-destructive">{errors.patient}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo de atendimento">
              {(a11y) => (
                <Select {...a11y} value={kind} onChange={(e) => setKind(e.target.value as AttendanceKind)}>
                  {ATTENDANCE_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {KIND_LABELS[k]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Veterinário responsável" error={errors.vet}>
              {(a11y) => (
                <Select {...a11y} value={veterinarianId} onChange={(e) => setVeterinarianId(e.target.value)}>
                  <option value="">Selecione</option>
                  {veterinarians?.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                      {v.crmv ? ` — ${v.crmv}` : ''}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>

          <Field label="Queixa principal (opcional)" hint="Pode ser preenchida agora, na recepção, ou depois pelo veterinário.">
            {(a11y) => (
              <Textarea
                {...a11y}
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                rows={3}
              />
            )}
          </Field>
        </div>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Cancelar
        </Button>
        <Button type="submit" loading={createAttendance.isPending}>
          Abrir atendimento
        </Button>
      </div>
    </form>
  )
}
