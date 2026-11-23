import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { Field, Input, Select, Textarea } from '../../components/ui/Field'
import { applyServerErrors } from '../../lib/form-errors'
import { formatDate, inputToCents, parseDecimal, todayInput, toDateInput } from '../../lib/format'
import { PatientPicker, type PickedPatient } from '../patients/PatientPicker'
import {
  useBatchAdjust,
  useStockEntry,
  useStockExit,
  type MedicationDetail,
  type StockBatch,
} from './stock-api'
import { UNIT_LABELS, formatQuantity } from './units'

/** Quantidade positiva com até 3 casas decimais. */
const quantityField = (allowZero = false) =>
  z.string().refine((v) => {
    const n = parseDecimal(v)
    return n !== null && Number.isFinite(n) && (allowZero ? n >= 0 : n > 0)
  }, allowZero ? 'Informe um número (0 ou mais)' : 'Informe uma quantidade maior que zero')

const actions = (onCancel: () => void, submitLabel: string, loading: boolean) => (
  <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
    <Button variant="secondary" onClick={onCancel}>
      Cancelar
    </Button>
    <Button type="submit" loading={loading}>
      {submitLabel}
    </Button>
  </div>
)

// ---------- Entrada ----------

const entrySchema = z.object({
  batchNumber: z.string().trim().min(1, 'Informe o lote'),
  expiresAt: z
    .string()
    .min(1, 'Informe a validade')
    .refine((v) => v >= todayInput(), 'Lote vencido não pode entrar no estoque'),
  quantity: quantityField(),
  unitCost: z.string().refine((v) => {
    const c = inputToCents(v)
    return c === null || (Number.isFinite(c) && c >= 0)
  }, 'Valor inválido'),
  supplier: z.string(),
  reason: z.string(),
})

export function EntryDialog({
  medication,
  open,
  onClose,
}: {
  medication: MedicationDetail
  open: boolean
  onClose: () => void
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Registrar entrada"
      description={`${medication.name} — quantidade em ${UNIT_LABELS[medication.unit].many}.`}
    >
      <EntryForm medication={medication} onDone={onClose} />
    </Dialog>
  )
}

function EntryForm({ medication, onDone }: { medication: MedicationDetail; onDone: () => void }) {
  const entry = useStockEntry(medication.id)
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof entrySchema>>({
    resolver: zodResolver(entrySchema),
    defaultValues: { batchNumber: '', expiresAt: '', quantity: '', unitCost: '', supplier: '', reason: '' },
  })

  // Lote já cadastrado: preenche a validade para evitar divergência
  const fillExistingBatch = (batchNumber: string) => {
    const existing = medication.batches.find(
      (b) => b.batchNumber === batchNumber.trim().toUpperCase(),
    )
    if (existing) setValue('expiresAt', toDateInput(existing.expiresAt), { shouldValidate: true })
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      await entry.mutateAsync({
        batchNumber: values.batchNumber,
        expiresAt: values.expiresAt,
        quantity: parseDecimal(values.quantity) ?? 0,
        unitCostCents: inputToCents(values.unitCost),
        supplier: values.supplier || null,
        reason: values.reason || null,
      })
      onDone()
    } catch (error) {
      setFormError(
        applyServerErrors(error, (field, err) =>
          setError(field === 'unitCostCents' ? 'unitCost' : (field as 'quantity'), err),
        ),
      )
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {formError && <Alert>{formError}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Lote" error={errors.batchNumber?.message} hint="Lote existente: a quantidade é somada.">
          {(a11y) => (
            <>
              <Input
                {...a11y}
                {...register('batchNumber', { onBlur: (e) => fillExistingBatch(e.target.value) })}
                list="existing-batches"
                autoComplete="off"
                className="font-mono uppercase"
                autoFocus
              />
              <datalist id="existing-batches">
                {medication.batches.map((b) => (
                  <option key={b.id} value={b.batchNumber}>
                    Validade {formatDate(b.expiresAt)}
                  </option>
                ))}
              </datalist>
            </>
          )}
        </Field>
        <Field label="Validade" error={errors.expiresAt?.message}>
          {(a11y) => <Input {...a11y} {...register('expiresAt')} type="date" min={todayInput()} />}
        </Field>
        <Field label={`Quantidade (${UNIT_LABELS[medication.unit].many})`} error={errors.quantity?.message}>
          {(a11y) => <Input {...a11y} {...register('quantity')} inputMode="decimal" className="font-mono" />}
        </Field>
        <Field
          label="Custo unitário em R$ (opcional)"
          error={errors.unitCost?.message}
          hint={`Por ${UNIT_LABELS[medication.unit].one}.`}
        >
          {(a11y) => (
            <Input {...a11y} {...register('unitCost')} inputMode="decimal" placeholder="0,00" className="font-mono" />
          )}
        </Field>
        <Field label="Fornecedor (opcional)" error={errors.supplier?.message} className="sm:col-span-2">
          {(a11y) => <Input {...a11y} {...register('supplier')} />}
        </Field>
        <Field label="Observação (opcional)" error={errors.reason?.message} className="sm:col-span-2" hint="Ex.: nota fiscal 1234.">
          {(a11y) => <Input {...a11y} {...register('reason')} />}
        </Field>
      </div>
      {actions(onDone, 'Registrar entrada', isSubmitting)}
    </form>
  )
}

// ---------- Saída ----------

const exitSchema = z.object({
  quantity: quantityField(),
  batchId: z.string(),
  reason: z.string(),
})

export function ExitDialog({
  medication,
  open,
  onClose,
}: {
  medication: MedicationDetail
  open: boolean
  onClose: () => void
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Registrar saída"
      description={`${medication.name} — disponível: ${formatQuantity(medication.stock.available, medication.unit)}.`}
    >
      <ExitForm medication={medication} onDone={onClose} />
    </Dialog>
  )
}

function ExitForm({ medication, onDone }: { medication: MedicationDetail; onDone: () => void }) {
  const exit = useStockExit(medication.id)
  const [patient, setPatient] = useState<PickedPatient | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const usableBatches = medication.batches.filter((b) => b.quantity > 0 && !b.expired)

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof exitSchema>>({
    resolver: zodResolver(exitSchema),
    defaultValues: { quantity: '', batchId: '', reason: '' },
  })
  const reason = useWatch({ control, name: 'reason' })
  const needsJustification = medication.controlled && !patient && !reason.trim()

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    if (needsJustification) {
      setError('reason', { message: 'Controlado: informe o paciente ou a justificativa' })
      return
    }
    try {
      await exit.mutateAsync({
        quantity: parseDecimal(values.quantity) ?? 0,
        batchId: values.batchId || null,
        patientId: patient?.id ?? null,
        reason: values.reason || null,
      })
      onDone()
    } catch (error) {
      setFormError(applyServerErrors(error, setError))
    }
  })

  if (usableBatches.length === 0) {
    return (
      <div className="space-y-4">
        <Alert>Não há lotes dentro da validade com saldo. Registre uma entrada primeiro.</Alert>
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onDone}>
            Fechar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {formError && <Alert>{formError}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={`Quantidade (${UNIT_LABELS[medication.unit].many})`} error={errors.quantity?.message}>
          {(a11y) => (
            <Input {...a11y} {...register('quantity')} inputMode="decimal" className="font-mono" autoFocus />
          )}
        </Field>
        <Field label="Lote" error={errors.batchId?.message}>
          {(a11y) => (
            <Select {...a11y} {...register('batchId')}>
              <option value="">Automático (vence primeiro)</option>
              {usableBatches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batchNumber} — {formatQuantity(b.quantity, medication.unit)} — val. {formatDate(b.expiresAt)}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <PatientPicker
        label="Paciente (opcional)"
        value={patient}
        onChange={setPatient}
        hint="Na Etapa 5 a saída também poderá ser lançada direto no atendimento."
      />

      <Field
        label={medication.controlled ? 'Justificativa' : 'Motivo (opcional)'}
        error={errors.reason?.message}
        hint={
          medication.controlled
            ? 'Medicamento controlado: obrigatório quando não houver paciente.'
            : 'Ex.: uso interno, aplicação no ambulatório.'
        }
      >
        {(a11y) => <Textarea {...a11y} {...register('reason')} rows={2} />}
      </Field>

      {actions(onDone, 'Registrar saída', isSubmitting)}
    </form>
  )
}

// ---------- Perda / ajuste de inventário ----------

const adjustSchema = z.object({
  type: z.enum(['perda', 'ajuste']),
  quantity: z.string(),
  reason: z.string().trim().min(3, 'Informe o motivo'),
})

export function AdjustDialog({
  medication,
  batch,
  canAdjust,
  onClose,
}: {
  medication: MedicationDetail
  batch: StockBatch | null
  /** Ajuste de inventário: só administradores */
  canAdjust: boolean
  onClose: () => void
}) {
  return (
    <Dialog
      open={Boolean(batch)}
      onClose={onClose}
      title={canAdjust ? 'Perda ou ajuste de inventário' : 'Registrar perda / descarte'}
      description={
        batch
          ? `Lote ${batch.batchNumber} — saldo atual: ${formatQuantity(batch.quantity, medication.unit)}.`
          : undefined
      }
    >
      {batch && <AdjustForm medication={medication} batch={batch} canAdjust={canAdjust} onDone={onClose} />}
    </Dialog>
  )
}

function AdjustForm({
  medication,
  batch,
  canAdjust,
  onDone,
}: {
  medication: MedicationDetail
  batch: StockBatch
  canAdjust: boolean
  onDone: () => void
}) {
  const adjust = useBatchAdjust()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof adjustSchema>>({
    resolver: zodResolver(adjustSchema),
    defaultValues: { type: 'perda', quantity: '', reason: batch.expired ? 'Lote vencido — descarte' : '' },
  })
  const type = useWatch({ control, name: 'type' })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    const quantity = parseDecimal(values.quantity)
    const valid = quantity !== null && Number.isFinite(quantity) && (values.type === 'ajuste' ? quantity >= 0 : quantity > 0)
    if (!valid) {
      setError('quantity', { message: 'Informe uma quantidade válida' })
      return
    }
    try {
      await adjust.mutateAsync({ batchId: batch.id, type: values.type, quantity, reason: values.reason })
      onDone()
    } catch (error) {
      setFormError(applyServerErrors(error, setError))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {formError && <Alert>{formError}</Alert>}

      {canAdjust && (
        <fieldset className="grid gap-2 sm:grid-cols-2">
          <legend className="mb-1.5 text-sm font-medium">Tipo</legend>
          {(
            [
              ['perda', 'Perda / descarte', 'Avaria, vencimento, quebra.'],
              ['ajuste', 'Ajuste de inventário', 'Corrige o saldo pela contagem física.'],
            ] as const
          ).map(([value, label, description]) => (
            <label
              key={value}
              className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-border p-3 has-checked:border-primary has-checked:bg-primary/5"
            >
              <input type="radio" value={value} {...register('type')} className="mt-0.5 size-4 accent-primary" />
              <span>
                <span className="block text-sm font-medium">{label}</span>
                <span className="block text-xs text-muted-foreground">{description}</span>
              </span>
            </label>
          ))}
        </fieldset>
      )}

      <Field
        label={
          type === 'ajuste'
            ? `Saldo contado (${UNIT_LABELS[medication.unit].many})`
            : `Quantidade perdida (${UNIT_LABELS[medication.unit].many})`
        }
        error={errors.quantity?.message}
        hint={type === 'ajuste' ? 'Informe quanto existe fisicamente neste lote.' : undefined}
      >
        {(a11y) => <Input {...a11y} {...register('quantity')} inputMode="decimal" className="font-mono" autoFocus />}
      </Field>

      <Field label="Motivo" error={errors.reason?.message}>
        {(a11y) => <Textarea {...a11y} {...register('reason')} rows={2} />}
      </Field>

      {actions(onDone, type === 'ajuste' ? 'Ajustar saldo' : 'Registrar perda', isSubmitting)}
    </form>
  )
}
