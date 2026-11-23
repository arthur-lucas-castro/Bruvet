import { History, Pencil, Stethoscope, TriangleAlert } from 'lucide-react'
import { PatientAttendancesCard } from '../attendances/PatientAttendancesCard'
import { Link, useParams } from 'react-router'
import { Badge } from '../../components/ui/Badge'
import { ButtonLink } from '../../components/ui/ButtonLink'
import { Card, InfoList } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { ApiError } from '../../lib/api'
import { formatAge, formatDate, formatPhone, formatRecordCode, formatWeight } from '../../lib/format'
import { PatientAvatar } from './PatientRow'
import { usePatient } from './patients-api'
import { SEX_LABELS, SIZE_LABELS, SPECIES_LABELS, neuteredLabel } from './species'

export function PatientDetailPage() {
  const { id } = useParams()
  const { data: patient, isPending, error } = usePatient(id)

  if (isPending) return <LoadingState />
  if (error) {
    return (
      <ErrorState
        message={
          error instanceof ApiError && error.status === 404 ? 'Paciente não encontrado.' : undefined
        }
      />
    )
  }

  const age = formatAge(patient.birthDate, patient.deceasedAt)
  const { tutor } = patient

  return (
    <div className="space-y-5">
      <PageHeader
        backTo={{ to: '/pacientes', label: 'Pacientes' }}
        title={
          <span className="flex items-center gap-3">
            <PatientAvatar species={patient.species} muted={Boolean(patient.deceasedAt)} size="lg" />
            <span>
              {patient.name}
              <span className="mt-0.5 block font-mono text-sm font-normal text-muted-foreground">
                Prontuário nº {formatRecordCode(patient.code)}
              </span>
            </span>
          </span>
        }
        actions={
          <>
            <ButtonLink to={`/pacientes/${patient.id}/historico`} variant="secondary">
              <History className="size-4" aria-hidden="true" />
              Histórico
            </ButtonLink>
            <ButtonLink to={`/pacientes/${patient.id}/editar`} variant="secondary">
              <Pencil className="size-4" aria-hidden="true" />
              Editar
            </ButtonLink>
            {!patient.deceasedAt && (
              <ButtonLink to={`/atendimentos/novo?patientId=${patient.id}`}>
                <Stethoscope className="size-4" aria-hidden="true" />
                Novo atendimento
              </ButtonLink>
            )}
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Badge tone="primary">{SPECIES_LABELS[patient.species]}</Badge>
        <Badge>{SEX_LABELS[patient.sex]}</Badge>
        {patient.neutered && <Badge>{neuteredLabel(patient.sex)}</Badge>}
        {patient.deceasedAt && <Badge tone="danger">Óbito em {formatDate(patient.deceasedAt)}</Badge>}
      </div>

      {patient.allergies && (
        <div
          role="note"
          className="flex items-start gap-3 rounded-xl border border-accent/40 bg-orange-50 px-4 py-3 text-orange-900"
        >
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden="true" />
          <div>
            <p className="font-semibold">Alergias</p>
            <p className="whitespace-pre-line text-sm">{patient.allergies}</p>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
          <Card title="Dados do paciente">
            <InfoList
              items={[
                { label: 'Raça', value: patient.breed },
                { label: 'Pelagem / cor', value: patient.color },
                {
                  label: 'Nascimento',
                  value: patient.birthDate && (
                    <>
                      {formatDate(patient.birthDate)}
                      {patient.birthDateEstimated && (
                        <span className="text-muted-foreground"> (aproximada)</span>
                      )}
                    </>
                  ),
                },
                {
                  label: patient.deceasedAt ? 'Idade no óbito' : 'Idade',
                  value: age && (patient.birthDateEstimated ? `cerca de ${age}` : age),
                },
                { label: 'Peso atual', value: formatWeight(patient.weightKg) },
                { label: 'Porte', value: patient.size && SIZE_LABELS[patient.size] },
                {
                  label: 'Microchip',
                  value: patient.microchip && <span className="font-mono">{patient.microchip}</span>,
                },
              ]}
            />
          </Card>

          <Card title="Saúde">
            <InfoList
              items={[
                {
                  label: 'Doenças crônicas / condições',
                  value: patient.chronicConditions && (
                    <span className="whitespace-pre-line">{patient.chronicConditions}</span>
                  ),
                },
                {
                  label: 'Observações',
                  value: patient.notes && <span className="whitespace-pre-line">{patient.notes}</span>,
                },
              ]}
            />
          </Card>

          <PatientAttendancesCard patientId={patient.id} canOpen={!patient.deceasedAt} />
        </div>

        <div className="lg:col-span-2">
          <Card title="Tutor">
            <p className="font-medium">
              <Link to={`/tutores/${tutor.id}`} className="hover:text-primary">
                {tutor.name}
              </Link>
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              <li>
                <a href={`tel:${tutor.phone}`} className="font-mono hover:text-primary">
                  {formatPhone(tutor.phone)}
                </a>
              </li>
              {tutor.phoneAlt && (
                <li>
                  <a href={`tel:${tutor.phoneAlt}`} className="font-mono hover:text-primary">
                    {formatPhone(tutor.phoneAlt)}
                  </a>
                </li>
              )}
              {tutor.email && (
                <li className="break-all">
                  <a href={`mailto:${tutor.email}`} className="hover:text-primary">
                    {tutor.email}
                  </a>
                </li>
              )}
            </ul>
            <Link
              to={`/tutores/${tutor.id}`}
              className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline"
            >
              Ver ficha do tutor
            </Link>
          </Card>
        </div>
      </div>
    </div>
  )
}
