import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { z } from 'zod'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Field, Input, Select, Textarea } from '../../components/ui/Field'
import { PageHeader } from '../../components/ui/PageHeader'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { applyServerErrors } from '../../lib/form-errors'
import { formatCep, formatCpf, formatPhone, onlyDigits } from '../../lib/format'
import { maskedRegister } from '../../lib/masked-register'
import { useSaveTutor, useTutor, type Tutor } from './tutors-api'

const STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

const schema = z.object({
  name: z.string().trim().min(2, 'Informe o nome'),
  cpf: z.string().refine((v) => [0, 11].includes(onlyDigits(v).length), 'CPF incompleto'),
  phone: z.string().refine((v) => /^\d{10,11}$/.test(onlyDigits(v)), 'Informe DDD + número'),
  phoneAlt: z
    .string()
    .refine((v) => !v || /^\d{10,11}$/.test(onlyDigits(v)), 'Informe DDD + número'),
  email: z.union([z.email('E-mail inválido'), z.literal('')]),
  zipCode: z.string().refine((v) => [0, 8].includes(onlyDigits(v).length), 'CEP incompleto'),
  street: z.string(),
  number: z.string(),
  complement: z.string(),
  district: z.string(),
  city: z.string(),
  state: z.string(),
  notes: z.string(),
})

type FormValues = z.infer<typeof schema>

function toFormValues(tutor?: Tutor): FormValues {
  return {
    name: tutor?.name ?? '',
    cpf: formatCpf(tutor?.cpf),
    phone: formatPhone(tutor?.phone),
    phoneAlt: formatPhone(tutor?.phoneAlt),
    email: tutor?.email ?? '',
    zipCode: formatCep(tutor?.zipCode),
    street: tutor?.street ?? '',
    number: tutor?.number ?? '',
    complement: tutor?.complement ?? '',
    district: tutor?.district ?? '',
    city: tutor?.city ?? '',
    state: tutor?.state ?? '',
    notes: tutor?.notes ?? '',
  }
}

/** Cadastro (/tutores/novo) e edição (/tutores/:id/editar). */
export function TutorFormPage() {
  const { id } = useParams()
  const { data: tutor, isPending, isError } = useTutor(id)

  if (id && isPending) return <LoadingState />
  if (id && isError) return <ErrorState message="Tutor não encontrado." />

  return <TutorForm key={tutor?.id ?? 'novo'} tutor={tutor} />
}

function TutorForm({ tutor }: { tutor?: Tutor }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  // Veio do cadastro de paciente: depois de salvar, volta para lá com o tutor selecionado
  const nextIsPatient = searchParams.get('next') === 'paciente'
  const saveTutor = useSaveTutor()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toFormValues(tutor) })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      const saved = await saveTutor.mutateAsync({
        id: tutor?.id,
        ...values,
        cpf: values.cpf || null,
        phoneAlt: values.phoneAlt || null,
        email: values.email || null,
        zipCode: values.zipCode || null,
        street: values.street || null,
        number: values.number || null,
        complement: values.complement || null,
        district: values.district || null,
        city: values.city || null,
        state: values.state || null,
        notes: values.notes || null,
      })
      navigate(nextIsPatient ? `/pacientes/novo?tutorId=${saved.id}` : `/tutores/${saved.id}`, {
        replace: true,
      })
    } catch (error) {
      setFormError(applyServerErrors(error, setError))
    }
  })

  const backTo = tutor
    ? { to: `/tutores/${tutor.id}`, label: tutor.name }
    : nextIsPatient
      ? { to: '/pacientes/novo', label: 'Novo paciente' }
      : { to: '/tutores', label: 'Tutores' }

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-3xl space-y-5">
      <PageHeader backTo={backTo} title={tutor ? 'Editar tutor' : 'Novo tutor'} />

      {formError && <Alert>{formError}</Alert>}

      <Card title="Identificação e contato">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome completo" error={errors.name?.message} className="sm:col-span-2">
            {(a11y) => <Input {...a11y} {...register('name')} autoComplete="off" autoFocus={!tutor} />}
          </Field>
          <Field label="CPF (opcional)" error={errors.cpf?.message}>
            {(a11y) => (
              <Input
                {...a11y}
                {...maskedRegister(register, 'cpf', formatCpf)}
                inputMode="numeric"
                placeholder="000.000.000-00"
                className="font-mono"
              />
            )}
          </Field>
          <Field label="E-mail (opcional)" error={errors.email?.message}>
            {(a11y) => <Input {...a11y} {...register('email')} type="email" inputMode="email" />}
          </Field>
          <Field label="Telefone" error={errors.phone?.message}>
            {(a11y) => (
              <Input
                {...a11y}
                {...maskedRegister(register, 'phone', formatPhone)}
                type="tel"
                inputMode="tel"
                placeholder="(11) 98765-4321"
                className="font-mono"
              />
            )}
          </Field>
          <Field label="Telefone alternativo (opcional)" error={errors.phoneAlt?.message}>
            {(a11y) => (
              <Input
                {...a11y}
                {...maskedRegister(register, 'phoneAlt', formatPhone)}
                type="tel"
                inputMode="tel"
                className="font-mono"
              />
            )}
          </Field>
        </div>
      </Card>

      <Card title="Endereço (opcional)">
        <div className="grid gap-4 sm:grid-cols-6">
          <Field label="CEP" error={errors.zipCode?.message} className="sm:col-span-2">
            {(a11y) => (
              <Input
                {...a11y}
                {...maskedRegister(register, 'zipCode', formatCep)}
                inputMode="numeric"
                placeholder="00000-000"
                className="font-mono"
              />
            )}
          </Field>
          <Field label="Rua" error={errors.street?.message} className="sm:col-span-4">
            {(a11y) => <Input {...a11y} {...register('street')} />}
          </Field>
          <Field label="Número" error={errors.number?.message} className="sm:col-span-2">
            {(a11y) => <Input {...a11y} {...register('number')} />}
          </Field>
          <Field label="Complemento" error={errors.complement?.message} className="sm:col-span-4">
            {(a11y) => <Input {...a11y} {...register('complement')} />}
          </Field>
          <Field label="Bairro" error={errors.district?.message} className="sm:col-span-2">
            {(a11y) => <Input {...a11y} {...register('district')} />}
          </Field>
          <Field label="Cidade" error={errors.city?.message} className="sm:col-span-3">
            {(a11y) => <Input {...a11y} {...register('city')} />}
          </Field>
          <Field label="UF" error={errors.state?.message} className="sm:col-span-1">
            {(a11y) => (
              <Select {...a11y} {...register('state')}>
                <option value="">—</option>
                {STATES.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </Card>

      <Card title="Observações">
        <Field label="Observações sobre o tutor (opcional)" error={errors.notes?.message}>
          {(a11y) => <Textarea {...a11y} {...register('notes')} rows={3} />}
        </Field>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {tutor ? 'Salvar alterações' : nextIsPatient ? 'Cadastrar e continuar' : 'Cadastrar tutor'}
        </Button>
      </div>
    </form>
  )
}
