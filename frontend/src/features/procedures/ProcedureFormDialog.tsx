import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { Checkbox, Field, Input, Select, Textarea } from '../../components/ui/Field'
import { LoadingState } from '../../components/ui/States'
import { applyServerErrors } from '../../lib/form-errors'
import { centsToInput, formatCurrency, inputToCents } from '../../lib/format'
import { variantLabel } from '../patients/species'
import { PriceVariantsField } from './PriceVariantsField'
import {
  procedureFormSchema,
  toVariantFormValue,
  toVariantInput,
  type ProcedureFormValues,
} from './procedure-form'
import {
  useProcedure,
  useProcedureCategories,
  useSaveProcedure,
  type PriceChange,
  type ProcedureDetail,
} from './procedures-api'

type ProcedureFormDialogProps = {
  open: boolean
  onClose: () => void
  /** Procedimento a editar; ausente = cadastro novo. */
  procedureId?: string
  /** Categoria pré-selecionada no cadastro (ex.: filtro atual da lista). */
  defaultCategoryId?: string
}

export function ProcedureFormDialog({
  open,
  onClose,
  procedureId,
  defaultCategoryId,
}: ProcedureFormDialogProps) {
  const { data: procedure, isPending } = useProcedure(open ? procedureId : undefined)

  return (
    <Dialog open={open} onClose={onClose} title={procedureId ? 'Editar procedimento' : 'Novo procedimento'}>
      {procedureId && isPending ? (
        <LoadingState />
      ) : (
        // O Dialog só monta o conteúdo quando aberto: o formulário começa limpo a cada abertura
        <ProcedureForm procedure={procedure} defaultCategoryId={defaultCategoryId} onDone={onClose} />
      )}
    </Dialog>
  )
}

// Campos da API que têm outro nome no formulário
const serverFieldMap: Record<string, keyof ProcedureFormValues> = {
  priceCents: 'price',
  costCents: 'cost',
  durationMinutes: 'duration',
  prices: 'variants',
}

function ProcedureForm({
  procedure,
  defaultCategoryId,
  onDone,
}: {
  procedure?: ProcedureDetail
  defaultCategoryId?: string
  onDone: () => void
}) {
  const { data: categories } = useProcedureCategories()
  const saveProcedure = useSaveProcedure()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ProcedureFormValues>({
    resolver: zodResolver(procedureFormSchema),
    defaultValues: {
      name: procedure?.name ?? '',
      code: procedure?.code ?? '',
      categoryId: procedure?.categoryId ?? defaultCategoryId ?? '',
      price: centsToInput(procedure?.priceCents),
      cost: centsToInput(procedure?.costCents),
      duration: procedure?.durationMinutes ? String(procedure.durationMinutes) : '',
      description: procedure?.description ?? '',
      preparation: procedure?.preparation ?? '',
      active: procedure?.active ?? true,
      variants: procedure?.prices.map(toVariantFormValue) ?? [],
    },
  })

  /** Ao sair de um campo de preço, mostra o valor no formato 1.500,00. */
  const formatPrice = (value: string) => {
    const cents = inputToCents(value)
    return cents !== null && Number.isFinite(cents) && cents >= 0 ? centsToInput(cents) : value
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      await saveProcedure.mutateAsync({
        id: procedure?.id,
        name: values.name,
        code: values.code || null,
        categoryId: values.categoryId,
        priceCents: inputToCents(values.price) ?? 0,
        costCents: values.cost.trim() ? inputToCents(values.cost) : null,
        prices: values.variants.map(toVariantInput),
        durationMinutes: values.duration ? Number(values.duration) : null,
        description: values.description || null,
        preparation: values.preparation || null,
        active: values.active,
      })
      onDone()
    } catch (error) {
      let variantsMessage: string | undefined
      const message = applyServerErrors(error, (field, err) => {
        const mapped = serverFieldMap[field] ?? (field as keyof ProcedureFormValues)
        // Erros das variações vêm agrupados; mostramos no topo do formulário
        if (mapped === 'variants') variantsMessage = err.message
        else setError(mapped, err)
      })
      setFormError(variantsMessage ?? message)
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {formError && <Alert>{formError}</Alert>}

      <Field label="Nome do procedimento" error={errors.name?.message}>
        {(a11y) => <Input {...a11y} {...register('name')} autoComplete="off" autoFocus />}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Categoria" error={errors.categoryId?.message}>
          {(a11y) => (
            <Select {...a11y} {...register('categoryId')}>
              <option value="">Selecione</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Código (opcional)" error={errors.code?.message} hint="Ex.: CON-01">
          {(a11y) => <Input {...a11y} {...register('code')} className="font-mono uppercase" />}
        </Field>
        <Field
          label="Valor padrão (R$)"
          error={errors.price?.message}
          hint="Usado quando nenhuma variação se aplica."
        >
          {(a11y) => (
            <Input
              {...a11y}
              {...register('price', {
                onBlur: (e) => setValue('price', formatPrice(e.target.value)),
              })}
              inputMode="decimal"
              placeholder="0,00"
              className="text-right font-mono"
            />
          )}
        </Field>
        <Field
          label="Custo direto (R$, opcional)"
          error={errors.cost?.message}
          hint="Materiais, terceiros etc. por execução. Usado no financeiro; não aparece para a equipe."
        >
          {(a11y) => (
            <Input
              {...a11y}
              {...register('cost', {
                onBlur: (e) => setValue('cost', e.target.value.trim() ? formatPrice(e.target.value) : ''),
              })}
              inputMode="decimal"
              placeholder="0,00"
              className="text-right font-mono"
            />
          )}
        </Field>
        <Field label="Duração em minutos (opcional)" error={errors.duration?.message}>
          {(a11y) => <Input {...a11y} {...register('duration')} inputMode="numeric" className="font-mono" />}
        </Field>
      </div>

      <PriceVariantsField
        control={control}
        register={register}
        errors={errors.variants}
        onPriceBlur={(index, value) => setValue(`variants.${index}.price`, formatPrice(value))}
      />

      <Field label="Descrição (opcional)" error={errors.description?.message}>
        {(a11y) => <Textarea {...a11y} {...register('description')} rows={2} />}
      </Field>
      <Field
        label="Preparo / orientações ao tutor (opcional)"
        error={errors.preparation?.message}
        hint="Ex.: jejum alimentar de 12 horas."
      >
        {(a11y) => <Textarea {...a11y} {...register('preparation')} rows={2} />}
      </Field>

      {procedure && (
        <Checkbox
          {...register('active')}
          label="Procedimento ativo"
          description="Inativos não aparecem para novos atendimentos, mas continuam no histórico."
        />
      )}

      {procedure && procedure.priceChanges.length > 0 && (
        <PriceHistory changes={procedure.priceChanges} />
      )}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {procedure ? 'Salvar alterações' : 'Cadastrar procedimento'}
        </Button>
      </div>
    </form>
  )
}

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

function describeChange(change: PriceChange) {
  if (change.newPriceCents === null) return `Removida (era ${formatCurrency(change.oldPriceCents ?? 0)})`
  if (change.oldPriceCents === null) return `Criada: ${formatCurrency(change.newPriceCents)}`
  return `${formatCurrency(change.oldPriceCents)} → ${formatCurrency(change.newPriceCents)}`
}

function PriceHistory({ changes }: { changes: PriceChange[] }) {
  return (
    <details className="rounded-lg border border-border">
      <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-medium">
        Histórico de preços ({changes.length})
      </summary>
      <ul className="divide-y divide-border border-t border-border text-sm">
        {changes.map((change) => (
          <li key={change.id} className="space-y-0.5 px-3 py-2">
            <p className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="font-medium">{variantLabel(change.species, change.size)}</span>
              <span className="font-mono">{describeChange(change)}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {dateTimeFormatter.format(new Date(change.changedAt))} · {change.changedBy.name}
            </p>
          </li>
        ))}
      </ul>
    </details>
  )
}
