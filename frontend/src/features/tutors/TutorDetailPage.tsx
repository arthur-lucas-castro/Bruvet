import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Button } from '../../components/ui/Button'
import { ButtonLink } from '../../components/ui/ButtonLink'
import { Card, InfoList } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { PageHeader } from '../../components/ui/PageHeader'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { ApiError } from '../../lib/api'
import { formatCep, formatCpf, formatPhone } from '../../lib/format'
import { useAuthenticatedUser } from '../auth/auth-api'
import { PatientRow } from '../patients/PatientRow'
import { useDeleteTutor, useTutor, type Tutor } from './tutors-api'

function formatAddress(t: Tutor) {
  const line1 = [t.street, t.number].filter(Boolean).join(', ')
  const line2 = [t.complement, t.district].filter(Boolean).join(' — ')
  const line3 = [t.city, t.state].filter(Boolean).join('/')
  const lines = [line1, line2, [line3, t.zipCode && `CEP ${formatCep(t.zipCode)}`].filter(Boolean).join(' · ')]
  return lines.filter(Boolean)
}

export function TutorDetailPage() {
  const { id } = useParams()
  const user = useAuthenticatedUser()
  const navigate = useNavigate()
  const { data: tutor, isPending, error } = useTutor(id)
  const deleteTutor = useDeleteTutor()
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (isPending) return <LoadingState />
  if (error) {
    return (
      <ErrorState
        message={error instanceof ApiError && error.status === 404 ? 'Tutor não encontrado.' : undefined}
      />
    )
  }

  const address = formatAddress(tutor)
  const canDelete = user.role === 'admin' && tutor.patients.length === 0

  return (
    <div className="space-y-5">
      <PageHeader
        backTo={{ to: '/tutores', label: 'Tutores' }}
        title={tutor.name}
        subtitle={
          tutor.patients.length === 1 ? '1 paciente' : `${tutor.patients.length} pacientes`
        }
        actions={
          <>
            {canDelete && (
              <Button variant="secondary" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="size-4" aria-hidden="true" />
                Excluir
              </Button>
            )}
            <ButtonLink to={`/tutores/${tutor.id}/editar`} variant="secondary">
              <Pencil className="size-4" aria-hidden="true" />
              Editar
            </ButtonLink>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
          <Card
            title="Pacientes"
            actions={
              <ButtonLink to={`/pacientes/novo?tutorId=${tutor.id}`} className="min-h-9 px-3">
                <Plus className="size-4" aria-hidden="true" />
                Adicionar
              </ButtonLink>
            }
          >
            {tutor.patients.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum paciente cadastrado para este tutor.</p>
            ) : (
              <ul className="-mx-5 -my-5 divide-y divide-border">
                {tutor.patients.map((patient) => (
                  <PatientRow key={patient.id} patient={patient} />
                ))}
              </ul>
            )}
          </Card>

          {tutor.notes && (
            <Card title="Observações">
              <p className="whitespace-pre-line text-sm">{tutor.notes}</p>
            </Card>
          )}
        </div>

        <div className="space-y-5 lg:col-span-2">
          <Card title="Contato">
            <InfoList
              items={[
                {
                  label: 'Telefone',
                  value: (
                    <a href={`tel:${tutor.phone}`} className="font-mono hover:text-primary">
                      {formatPhone(tutor.phone)}
                    </a>
                  ),
                },
                {
                  label: 'Telefone alternativo',
                  value: tutor.phoneAlt && (
                    <a href={`tel:${tutor.phoneAlt}`} className="font-mono hover:text-primary">
                      {formatPhone(tutor.phoneAlt)}
                    </a>
                  ),
                },
                {
                  label: 'E-mail',
                  value: tutor.email && (
                    <a href={`mailto:${tutor.email}`} className="hover:text-primary">
                      {tutor.email}
                    </a>
                  ),
                },
                { label: 'CPF', value: tutor.cpf && <span className="font-mono">{formatCpf(tutor.cpf)}</span> },
              ]}
            />
          </Card>

          <Card title="Endereço">
            {address.length ? (
              <address className="space-y-0.5 text-sm not-italic">
                {address.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </address>
            ) : (
              <p className="text-sm text-muted-foreground">Endereço não informado.</p>
            )}
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Excluir tutor"
        description={`O cadastro de ${tutor.name} será removido definitivamente.`}
        confirmLabel="Excluir tutor"
        onConfirm={async () => {
          await deleteTutor.mutateAsync(tutor.id)
          navigate('/tutores', { replace: true })
        }}
      />
    </div>
  )
}
