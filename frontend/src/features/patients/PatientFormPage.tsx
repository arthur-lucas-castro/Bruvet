import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { z } from 'zod'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Checkbox, Field, Input, Select, Textarea } from '../../components/ui/Field'
import { PageHeader } from '../../components/ui/PageHeader'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { applyServerErrors } from '../../lib/form-errors'
import { formatRecordCode, parseDecimal, toDateInput, todayInput } from '../../lib/format'
import { useTutor, type Tutor } from '../tutors/tutors-api'
import { usePatient, useSavePatient, type PatientDetail } from './patients-api'
import {
  SEXES,
  SEX_LABELS,
  SIZES,
  SIZE_LABELS,
  SPECIES,
  SPECIES_LABELS,
  neuteredLabel,
  type Size,
} from './species'
import { TutorPicker } from './TutorPicker'

type TutorSummary = Pick<Tutor, 'id' | 'name' | 'phone'>

const schema = z
  .object({
    tutorId: z.string().min(1, 'Selecione o tutor'),
    name: z.string().trim().min(1, 'Informe o nome'),
    species: z.union([z.enum(SPECIES), z.literal('')]).refine(Boolean, 'Selecione a espécie'),
    breed: z.string(),
    sex: z.union([z.enum(SEXES), z.literal('')]).refine(Boolean, 'Selecione o sexo'),
    neutered: z.boolean(),
    birthDate: z.string().refine((v) => !v || v <= todayInput(), 'A data não pode estar no futuro'),
    birthDateEstimated: z.boolean(),
    color: z.string(),
    microchip: z.string(),
    weightKg: z.string().refine((v) => {
      const n = parseDecimal(v)
      return n === null || (Number.isFinite(n) && n > 0)
    }, 'Informe o peso em kg, ex.: 12,5'),
    size: z.union([z.enum(SIZES), z.literal('')]),
    allergies: z.string(),
    chronicConditions: z.string(),
    notes: z.string(),
    deceased: z.boolean(),
    deceasedAt: z.string(),
  })
  .superRefine((data, ctx) => {
    if (!data.deceased) return
    if (!data.deceasedAt) {
      ctx.addIssue({ code: 'custom', path: ['deceasedAt'], message: 'Informe a data do óbito' })
    } else if (data.deceasedAt > todayInput()) {
      ctx.addIssue({ code: 'custom', path: ['deceasedAt'], message: 'A data não pode estar no futuro' })
    } else if (data.birthDate && data.deceasedAt < data.birthDate) {
      ctx.addIssue({ code: 'custom', path: ['deceasedAt'], message: 'Precisa ser posterior ao nascimento' })
    }
  })

type FormValues = z.infer<typeof schema>

function toFormValues(patient?: PatientDetail, tutorId?: string): FormValues {
  return {
    tutorId: patient?.tutorId ?? tutorId ?? '',
    name: patient?.name ?? '',
    species: patient?.species ?? '',
    breed: patient?.breed ?? '',
    sex: patient?.sex ?? '',
    neutered: patient?.neutered ?? false,
    birthDate: toDateInput(patient?.birthDate),
    birthDateEstimated: patient?.birthDateEstimated ?? false,
    color: patient?.color ?? '',
    microchip: patient?.microchip ?? '',
    weightKg: patient?.weightKg != null ? String(patient.weightKg).replace('.', ',') : '',
    size: patient?.size ?? '',
    allergies: patient?.allergies ?? '',
    chronicConditions: patient?.chronicConditions ?? '',
    notes: patient?.notes ?? '',
    deceased: Boolean(patient?.deceasedAt),
    deceasedAt: toDateInput(patient?.deceasedAt),
  }
}

/** Cadastro (/pacientes/novo?tutorId=) e edição (/pacientes/:id/editar). */
export function PatientFormPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const tutorIdParam = id ? undefined : (searchParams.get('tutorId') ?? undefined)

  const patientQuery = usePatient(id)
  const tutorQuery = useTutor(tutorIdParam)

  if (id && patientQuery.isPending) return <LoadingState />
  if (id && patientQuery.isError) return <ErrorState message="Paciente não encontrado." />
  if (tutorIdParam && tutorQuery.isPending) return <LoadingState />

  const patient = patientQuery.data
  const initialTutor: TutorSummary | null = patient?.tutor ?? tutorQuery.data ?? null

  return (
    <PatientForm
      key={patient?.id ?? `novo-${initialTutor?.id ?? ''}`}
      patient={patient}
      initialTutor={initialTutor}
    />
  )
}

function PatientForm({
  patient,
  initialTutor,
}: {
  patient?: PatientDetail
  initialTutor: TutorSummary | null
}) {
  const navigate = useNavigate()
  const savePatient = useSavePatient()
  const [tutor, setTutor] = useState<TutorSummary | null>(initialTutor)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(patient, initialTutor?.id),
  })

  const [sex, deceased] = useWatch({ control, name: ['sex', 'deceased'] })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      const saved = await savePatient.mutateAsync({
        id: patient?.id,
        tutorId: values.tutorId,
        name: values.name,
        species: values.species as (typeof SPECIES)[number],
        breed: values.breed || null,
        sex: values.sex as (typeof SEXES)[number],
        neutered: values.neutered,
        birthDate: values.birthDate || null,
        birthDateEstimated: Boolean(values.birthDate) && values.birthDateEstimated,
        color: values.color || null,
        microchip: values.microchip || null,
        weightKg: parseDecimal(values.weightKg),
        size: (values.size || null) as Size | null,
        allergies: values.allergies || null,
        chronicConditions: values.chronicConditions || null,
        notes: values.notes || null,
        deceasedAt: values.deceased ? values.deceasedAt : null,
      })
      navigate(`/pacientes/${saved.id}`, { replace: true })
    } catch (error) {
      setFormError(applyServerErrors(error, setError))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-3xl space-y-5">
      <PageHeader
        backTo={
          patient
            ? { to: `/pacientes/${patient.id}`, label: patient.name }
            : { to: '/pacientes', label: 'Pacientes' }
        }
        title={patient ? 'Editar paciente' : 'Novo paciente'}
        subtitle={patient && <span className="font-mono">Prontuário nº {formatRecordCode(patient.code)}</span>}
      />

      {formError && <Alert>{formError}</Alert>}

      <Card title="Tutor responsável">
        <TutorPicker
          value={tutor}
          onChange={(selected) => {
            setTutor(selected)
            setValue('tutorId', selected?.id ?? '', { shouldValidate: Boolean(selected) })
          }}
          error={errors.tutorId?.message}
        />
      </Card>

      <Card title="Identificação">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome do animal" error={errors.name?.message}>
            {(a11y) => <Input {...a11y} {...register('name')} autoComplete="off" />}
          </Field>
          <Field label="Espécie" error={errors.species?.message}>
            {(a11y) => (
              <Select {...a11y} {...register('species')}>
                <option value="">Selecione</option>
                {SPECIES.map((s) => (
                  <option key={s} value={s}>
                    {SPECIES_LABELS[s]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Raça (opcional)" error={errors.breed?.message}>
            {(a11y) => <Input {...a11y} {...register('breed')} placeholder="Ex.: SRD, Labrador" />}
          </Field>
          <Field label="Pelagem / cor (opcional)" error={errors.color?.message}>
            {(a11y) => <Input {...a11y} {...register('color')} />}
          </Field>
          <Field label="Sexo" error={errors.sex?.message}>
            {(a11y) => (
              <Select {...a11y} {...register('sex')}>
                <option value="">Selecione</option>
                {SEXES.map((s) => (
                  <option key={s} value={s}>
                    {SEX_LABELS[s]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <div className="flex items-end">
            <Checkbox
              {...register('neutered')}
              label={sex ? neuteredLabel(sex as (typeof SEXES)[number]) : 'Castrado(a)'}
            />
          </div>
        </div>
      </Card>

      <Card title="Dados clínicos básicos">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Field label="Data de nascimento (opcional)" error={errors.birthDate?.message}>
              {(a11y) => <Input {...a11y} {...register('birthDate')} type="date" max={todayInput()} />}
            </Field>
            <Checkbox
              {...register('birthDateEstimated')}
              label="Data aproximada"
              description="Marque quando a idade for estimada."
            />
          </div>
          <Field label="Peso atual em kg (opcional)" error={errors.weightKg?.message}>
            {(a11y) => (
              <Input
                {...a11y}
                {...register('weightKg')}
                inputMode="decimal"
                placeholder="Ex.: 12,5"
                className="font-mono"
              />
            )}
          </Field>
          <Field
            label="Porte (opcional)"
            error={errors.size?.message}
            hint="Define o preço dos procedimentos que variam por porte."
          >
            {(a11y) => (
              <Select {...a11y} {...register('size')}>
                <option value="">Não informado</option>
                {SIZES.map((s) => (
                  <option key={s} value={s}>
                    {SIZE_LABELS[s]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Microchip (opcional)" error={errors.microchip?.message}>
            {(a11y) => <Input {...a11y} {...register('microchip')} className="font-mono" />}
          </Field>
          <Field
            label="Alergias (opcional)"
            error={errors.allergies?.message}
            hint="Aparece em destaque na ficha do paciente."
            className="sm:col-span-2"
          >
            {(a11y) => (
              <Textarea {...a11y} {...register('allergies')} rows={2} placeholder="Ex.: dipirona, frango" />
            )}
          </Field>
          <Field
            label="Doenças crônicas / condições (opcional)"
            error={errors.chronicConditions?.message}
            className="sm:col-span-2"
          >
            {(a11y) => <Textarea {...a11y} {...register('chronicConditions')} rows={2} />}
          </Field>
          <Field label="Observações (opcional)" error={errors.notes?.message} className="sm:col-span-2">
            {(a11y) => <Textarea {...a11y} {...register('notes')} rows={3} />}
          </Field>
        </div>
      </Card>

      {patient && (
        <Card title="Óbito">
          <Checkbox {...register('deceased')} label="Registrar óbito deste paciente" />
          {deceased && (
            <Field label="Data do óbito" error={errors.deceasedAt?.message} className="mt-2 max-w-xs">
              {(a11y) => <Input {...a11y} {...register('deceasedAt')} type="date" max={todayInput()} />}
            </Field>
          )}
        </Card>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {patient ? 'Salvar alterações' : 'Cadastrar paciente'}
        </Button>
      </div>
    </form>
  )
}
