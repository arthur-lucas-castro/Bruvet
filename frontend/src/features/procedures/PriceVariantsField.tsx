import { Plus, Trash2 } from 'lucide-react'
import { useFieldArray, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Field'
import { SIZES, SIZE_LABELS, SPECIES, SPECIES_LABELS } from '../patients/species'
import type { ProcedureFormValues } from './procedure-form'

type PriceVariantsFieldProps = {
  control: Control<ProcedureFormValues>
  register: UseFormRegister<ProcedureFormValues>
  errors?: FieldErrors<ProcedureFormValues>['variants']
  /** Formata o preço ao sair do campo */
  onPriceBlur: (index: number, value: string) => void
}

/** Lista editável de variações de preço por espécie e/ou porte. */
export function PriceVariantsField({ control, register, errors, onPriceBlur }: PriceVariantsFieldProps) {
  const { fields, append, remove } = useFieldArray({ control, name: 'variants' })

  return (
    <fieldset className="space-y-3 rounded-lg border border-border p-3">
      <legend className="px-1 text-sm font-medium">Variações de preço (opcional)</legend>
      <p className="text-sm text-muted-foreground">
        Para cobrar diferente por espécie e/ou porte. No atendimento vale a variação mais
        específica para o animal; sem variação que combine, vale o valor padrão.
      </p>

      {fields.length > 0 && (
        <ul className="space-y-3">
          {fields.map((field, index) => {
            const rowErrors = errors?.[index]
            const rowMessage = rowErrors?.species?.message ?? rowErrors?.price?.message
            return (
              <li key={field.id} className="space-y-1">
                <div className="grid grid-cols-[1fr_1fr_auto] gap-2 sm:grid-cols-[1fr_1fr_8rem_auto]">
                  <Select
                    {...register(`variants.${index}.species`)}
                    aria-label={`Espécie da variação ${index + 1}`}
                    aria-invalid={rowErrors?.species ? true : undefined}
                  >
                    <option value="">Qualquer espécie</option>
                    {SPECIES.map((s) => (
                      <option key={s} value={s}>
                        {SPECIES_LABELS[s]}
                      </option>
                    ))}
                  </Select>
                  <Select
                    {...register(`variants.${index}.size`)}
                    aria-label={`Porte da variação ${index + 1}`}
                    aria-invalid={rowErrors?.species ? true : undefined}
                  >
                    <option value="">Qualquer porte</option>
                    {SIZES.map((s) => (
                      <option key={s} value={s}>
                        {SIZE_LABELS[s]}
                      </option>
                    ))}
                  </Select>
                  <Input
                    {...register(`variants.${index}.price`, {
                      onBlur: (e) => onPriceBlur(index, e.target.value),
                    })}
                    aria-label={`Valor da variação ${index + 1} em reais`}
                    aria-invalid={rowErrors?.price ? true : undefined}
                    inputMode="decimal"
                    placeholder="0,00"
                    className="col-span-2 text-right font-mono sm:col-span-1"
                  />
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    aria-label={`Remover variação ${index + 1}`}
                    className="col-start-3 row-start-1 flex size-11 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-destructive sm:col-start-4"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
                {rowMessage && <p className="text-sm text-destructive">{rowMessage}</p>}
              </li>
            )
          })}
        </ul>
      )}

      <Button
        variant="secondary"
        onClick={() => append({ species: '', size: '', price: '' })}
        disabled={fields.length >= 50}
        className="min-h-10"
      >
        <Plus className="size-4" aria-hidden="true" />
        Adicionar variação
      </Button>
    </fieldset>
  )
}
