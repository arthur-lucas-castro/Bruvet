import { zodResolver } from '@hookform/resolvers/zod'
import { Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useBlocker } from 'react-router'
import { z } from 'zod'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Dialog } from '../../components/ui/Dialog'
import { DictationHelp } from '../../components/ui/DictationHelp'
import { DictationTextarea } from '../../components/ui/DictationTextarea'
import { Field, Input, Select } from '../../components/ui/Field'
import { applyServerErrors } from '../../lib/form-errors'
import { parseDecimal } from '../../lib/format'
import { useSaveClinical, useVeterinarians, type AttendanceDetail, type ClinicalFields } from './attendances-api'
import {
  ATTENDANCE_KINDS,
  HYDRATION_LABELS,
  HYDRATION_LEVELS,
  KIND_LABELS,
  MUCOSA_LABELS,
  MUCOSA_TYPES,
  type AttendanceKind,
} from './constants'

const numberField = (integer = false) =>
  z.string().refine((v) => {
    const n = parseDecimal(v)
    return n === null || (Number.isFinite(n) && (!integer || Number.isInteger(n)))
  }, integer ? 'Informe um número inteiro' : 'Informe um número')

const schema = z.object({
  kind: z.enum(ATTENDANCE_KINDS),
  veterinarianId: z.string().min(1, 'Selecione o veterinário'),
  chiefComplaint: z.string(),
  history: z.string(),
  diet: z.string(),
  vaccination: z.string(),
  environment: z.string(),
  currentMedications: z.string(),
  weightKg: numberField(),
  temperatureC: numberField(),
  heartRate: numberField(true),
  respiratoryRate: numberField(true),
  capillaryRefillSec: numberField(),
  hydration: z.string(),
  mucosa: z.string(),
  bodyCondition: numberField(true),
  physicalExam: z.string(),
  diagnosis: z.string(),
  treatmentPlan: z.string(),
})

type FormValues = z.infer<typeof schema>

const TEXT_FIELDS = [
  'chiefComplaint',
  'history',
  'diet',
  'vaccination',
  'environment',
  'currentMedications',
  'hydration',
  'mucosa',
  'physicalExam',
  'diagnosis',
  'treatmentPlan',
] as const
const NUMBER_FIELDS = [
  'weightKg',
  'temperatureC',
  'heartRate',
  'respiratoryRate',
  'capillaryRefillSec',
  'bodyCondition',
] as const

const numberToInput = (n: number | null) => (n == null ? '' : String(n).replace('.', ','))

function toFormValues(a: AttendanceDetail): FormValues {
  const values = { kind: a.kind, veterinarianId: a.veterinarianId } as FormValues
  for (const key of TEXT_FIELDS) values[key] = a[key] ?? ''
  for (const key of NUMBER_FIELDS) values[key] = numberToInput(a[key])
  return values
}

function toPayload(values: FormValues): ClinicalFields {
  const payload = { kind: values.kind as AttendanceKind, veterinarianId: values.veterinarianId } as ClinicalFields
  for (const key of TEXT_FIELDS) payload[key] = values[key].trim() || null
  for (const key of NUMBER_FIELDS) payload[key] = parseDecimal(values[key])
  return payload
}

type ClinicalFormProps = {
  attendance: AttendanceDetail
  /** Ficha travada (finalizada/cancelada) ou usuário sem permissão clínica */
  readOnly: boolean
  onDirtyChange: (dirty: boolean) => void
}

/** Ficha clínica: dados do atendimento, anamnese, exame físico e conclusão. */
export function ClinicalForm({ attendance, readOnly, onDirtyChange }: ClinicalFormProps) {
  const { data: veterinarians } = useVeterinarians()
  const saveClinical = useSaveClinical(attendance.id)
  const [formError, setFormError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<Date | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toFormValues(attendance) })

  useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange])

  // Avisa antes de fechar/recarregar a aba com alterações não salvas
  useEffect(() => {
    if (!isDirty) return
    const handler = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  // Avisa antes de sair para outra tela do sistema
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => isDirty && currentLocation.pathname !== nextLocation.pathname,
  )

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      await saveClinical.mutateAsync(toPayload(values))
      reset(values)
      setSavedAt(new Date())
    } catch (error) {
      setFormError(applyServerErrors(error, setError))
    }
  })

  const text = (name: (typeof TEXT_FIELDS)[number], label: string, rows = 3, hint?: string) => (
    <Field label={label} error={errors[name]?.message} hint={hint}>
      {(a11y) => <DictationTextarea {...a11y} {...register(name)} rows={rows} />}
    </Field>
  )

  const number = (name: (typeof NUMBER_FIELDS)[number], label: string, unit?: string) => (
    <Field label={unit ? `${label} (${unit})` : label} error={errors[name]?.message}>
      {(a11y) => <Input {...a11y} {...register(name)} inputMode="decimal" className="font-mono" />}
    </Field>
  )

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {formError && <Alert>{formError}</Alert>}
      {!readOnly && <DictationHelp />}

      <fieldset disabled={readOnly} className="space-y-5">
        <Card title="Dados do atendimento">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo" error={errors.kind?.message}>
              {(a11y) => (
                <Select {...a11y} {...register('kind')}>
                  {ATTENDANCE_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {KIND_LABELS[k]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Veterinário responsável" error={errors.veterinarianId?.message}>
              {(a11y) => (
                <Select {...a11y} {...register('veterinarianId')}>
                  {/* Mantém o responsável atual mesmo que tenha sido desativado */}
                  {!veterinarians?.some((v) => v.id === attendance.veterinarianId) && (
                    <option value={attendance.veterinarianId}>{attendance.veterinarian.name}</option>
                  )}
                  {veterinarians?.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
        </Card>

        <Card title="Anamnese">
          <div className="space-y-4">
            {text('chiefComplaint', 'Queixa principal', 2, 'Obrigatória para finalizar.')}
            {text('history', 'Histórico da doença atual', 4, 'Início, evolução, sintomas, alterações de apetite, fezes e urina.')}
            <div className="grid gap-4 sm:grid-cols-2">
              {text('diet', 'Alimentação', 2)}
              {text('vaccination', 'Vacinação e vermifugação', 2)}
              {text('environment', 'Ambiente e contactantes', 2, 'Acesso à rua, outros animais, mudanças recentes.')}
              {text('currentMedications', 'Medicações em uso', 2)}
            </div>
          </div>
        </Card>

        <Card title="Exame físico">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {number('weightKg', 'Peso', 'kg')}
              {number('temperatureC', 'Temperatura', '°C')}
              {number('heartRate', 'FC', 'bpm')}
              {number('respiratoryRate', 'FR', 'mpm')}
              {number('capillaryRefillSec', 'TPC', 's')}
              {number('bodyCondition', 'Escore corporal', '1–9')}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Hidratação" error={errors.hydration?.message}>
                {(a11y) => (
                  <Select {...a11y} {...register('hydration')}>
                    <option value="">Não avaliada</option>
                    {HYDRATION_LEVELS.map((h) => (
                      <option key={h} value={h}>
                        {HYDRATION_LABELS[h]}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Mucosas" error={errors.mucosa?.message}>
                {(a11y) => (
                  <Select {...a11y} {...register('mucosa')}>
                    <option value="">Não avaliadas</option>
                    {MUCOSA_TYPES.map((m) => (
                      <option key={m} value={m}>
                        {MUCOSA_LABELS[m]}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
            {text('physicalExam', 'Achados do exame físico', 4, 'Linfonodos, palpação abdominal, auscultação, pele, olhos, ouvidos…')}
            {attendance.status === 'aberto' && (
              <p className="text-xs text-muted-foreground">O peso informado atualiza a ficha do paciente ao finalizar.</p>
            )}
          </div>
        </Card>

        <Card title="Diagnóstico e conduta">
          <div className="space-y-4">
            {text('diagnosis', 'Diagnóstico / suspeita', 2)}
            {text('treatmentPlan', 'Conduta, prescrição e orientações', 5)}
          </div>
        </Card>
      </fieldset>

      {!readOnly && (
        // Barra fixa no rodapé para salvar sem precisar rolar até o fim
        <div className="sticky bottom-0 z-10 -mx-4 flex items-center justify-between gap-3 border-t border-border bg-card/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
          <p className="text-sm text-muted-foreground" role="status">
            {isDirty
              ? 'Alterações não salvas'
              : savedAt
                ? `Salvo às ${savedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                : 'Ficha sem alterações'}
          </p>
          <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
            <Save className="size-4" aria-hidden="true" />
            Salvar ficha
          </Button>
        </div>
      )}

      <Dialog
        open={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        title="Sair sem salvar?"
        description="Há alterações na ficha clínica que ainda não foram salvas."
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="danger" onClick={() => blocker.proceed?.()}>
            Sair sem salvar
          </Button>
          <Button onClick={() => blocker.reset?.()}>Continuar editando</Button>
        </div>
      </Dialog>
    </form>
  )
}
