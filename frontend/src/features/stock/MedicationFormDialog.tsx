import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { z } from 'zod'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { Checkbox, Field, Input, Select, Textarea } from '../../components/ui/Field'
import { applyServerErrors } from '../../lib/form-errors'
import { centsToInput, inputToCents, parseDecimal } from '../../lib/format'
import { useAuthenticatedUser } from '../auth/auth-api'
import { useSaveMedication, type Medication } from './stock-api'
import { UNITS, UNIT_LABELS, formatNumber, type Unit } from './units'

const PRESENTATIONS = [
  'Comprimido',
  'Cápsula',
  'Injetável',
  'Solução oral',
  'Suspensão oral',
  'Pomada',
  'Creme',
  'Colírio',
  'Spray',
  'Pó',
  'Vacina',
]

const schema = z.object({
  name: z.string().trim().min(2, 'Informe o nome'),
  activeIngredient: z.string(),
  presentation: z.string(),
  concentration: z.string(),
  manufacturer: z.string(),
  unit: z.union([z.enum(UNITS), z.literal('')]).refine(Boolean, 'Selecione a unidade'),
  minStock: z.string().refine((v) => {
    const n = parseDecimal(v)
    return n === null || (Number.isFinite(n) && n >= 0)
  }, 'Informe um número, ex.: 20'),
  controlled: z.boolean(),
  salePrice: z.string().refine((v) => {
    if (!v.trim()) return true
    const c = inputToCents(v)
    return c !== null && Number.isFinite(c) && c >= 0
  }, 'Informe o preço, ex.: 5,00'),
  notes: z.string(),
  active: z.boolean(),
})

type FormValues = z.infer<typeof schema>

type MedicationFormDialogProps = {
  open: boolean
  onClose: () => void
  /** Medicamento a editar; ausente = cadastro novo. */
  medication?: Medication
}

export function MedicationFormDialog({ open, onClose, medication }: MedicationFormDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title={medication ? 'Editar medicamento' : 'Novo medicamento'}>
      {/* O Dialog só monta o conteúdo quando aberto: o formulário começa limpo a cada abertura */}
      <MedicationForm medication={medication} onDone={onClose} />
    </Dialog>
  )
}

function MedicationForm({ medication, onDone }: { medication?: Medication; onDone: () => void }) {
  const navigate = useNavigate()
  const isAdmin = useAuthenticatedUser().role === 'admin'
  const saveMedication = useSaveMedication()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: medication?.name ?? '',
      activeIngredient: medication?.activeIngredient ?? '',
      presentation: medication?.presentation ?? '',
      concentration: medication?.concentration ?? '',
      manufacturer: medication?.manufacturer ?? '',
      unit: medication?.unit ?? '',
      minStock: medication?.minStock ? formatNumber(medication.minStock) : '',
      controlled: medication?.controlled ?? false,
      salePrice: centsToInput(medication?.salePriceCents),
      notes: medication?.notes ?? '',
      active: medication?.active ?? true,
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      const saved = await saveMedication.mutateAsync({
        id: medication?.id,
        name: values.name,
        activeIngredient: values.activeIngredient || null,
        presentation: values.presentation || null,
        concentration: values.concentration || null,
        manufacturer: values.manufacturer || null,
        unit: values.unit as Unit,
        minStock: parseDecimal(values.minStock) ?? 0,
        controlled: values.controlled,
        // Só o admin altera; para os demais o backend mantém o preço atual
        salePriceCents: values.salePrice.trim() ? inputToCents(values.salePrice) : null,
        notes: values.notes || null,
        active: values.active,
      })
      onDone()
      // Depois de cadastrar, abre a ficha para registrar a primeira entrada
      if (!medication) navigate(`/estoque/${saved.id}`)
    } catch (error) {
      setFormError(applyServerErrors(error, setError))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {formError && <Alert>{formError}</Alert>}

      <Field label="Nome comercial" error={errors.name?.message} hint="Ex.: Meloxicam 2 mg">
        {(a11y) => <Input {...a11y} {...register('name')} autoComplete="off" autoFocus />}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Princípio ativo (opcional)" error={errors.activeIngredient?.message}>
          {(a11y) => <Input {...a11y} {...register('activeIngredient')} />}
        </Field>
        <Field label="Concentração (opcional)" error={errors.concentration?.message}>
          {(a11y) => <Input {...a11y} {...register('concentration')} placeholder="Ex.: 10 mg/mL" />}
        </Field>
        <Field label="Apresentação (opcional)" error={errors.presentation?.message}>
          {(a11y) => (
            <>
              <Input {...a11y} {...register('presentation')} list="presentations" />
              <datalist id="presentations">
                {PRESENTATIONS.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </>
          )}
        </Field>
        <Field label="Fabricante (opcional)" error={errors.manufacturer?.message}>
          {(a11y) => <Input {...a11y} {...register('manufacturer')} />}
        </Field>
        <Field
          label="Unidade de controle"
          error={errors.unit?.message}
          hint="O saldo e as movimentações usam esta unidade."
        >
          {(a11y) =>
            medication ? (
              // A unidade não muda depois do cadastro: o saldo e o histórico dependem dela
              <Input {...a11y} value={UNIT_LABELS[medication.unit].many} readOnly className="bg-muted" />
            ) : (
              <Select {...a11y} {...register('unit')}>
                <option value="">Selecione</option>
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {UNIT_LABELS[u].many}
                  </option>
                ))}
              </Select>
            )
          }
        </Field>
        <Field
          label="Estoque mínimo (opcional)"
          error={errors.minStock?.message}
          hint="Abaixo disso, entra no alerta."
        >
          {(a11y) => <Input {...a11y} {...register('minStock')} inputMode="decimal" className="font-mono" />}
        </Field>
        {isAdmin && (
          <Field
            label={`Preço de venda por ${medication ? UNIT_LABELS[medication.unit].one : 'unidade'} (R$, opcional)`}
            error={errors.salePrice?.message}
            hint="Preenchido: o uso em atendimento é cobrado na comanda. Vazio: entra só como custo."
            className="sm:col-span-2"
          >
            {(a11y) => <Input {...a11y} {...register('salePrice')} inputMode="decimal" placeholder="0,00" className="font-mono" />}
          </Field>
        )}
      </div>

      <Checkbox
        {...register('controlled')}
        label="Medicamento controlado"
        description="Toda saída exige o paciente ou uma justificativa."
      />

      <Field label="Observações (opcional)" error={errors.notes?.message} hint="Ex.: manter refrigerado.">
        {(a11y) => <Textarea {...a11y} {...register('notes')} rows={2} />}
      </Field>

      {medication && (
        <Checkbox
          {...register('active')}
          label="Cadastro ativo"
          description="Inativos saem da lista padrão, mas mantêm lotes e histórico."
        />
      )}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {medication ? 'Salvar alterações' : 'Cadastrar medicamento'}
        </Button>
      </div>
    </form>
  )
}
