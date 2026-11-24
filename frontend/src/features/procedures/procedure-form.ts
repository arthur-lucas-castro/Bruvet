import { z } from 'zod'
import { centsToInput, inputToCents } from '../../lib/format'
import type { Size, Species } from '../patients/species'

const isValidPrice = (v: string) => {
  const cents = inputToCents(v)
  return cents !== null && Number.isFinite(cents) && cents >= 0
}

/** Validação do formulário de procedimento (valor padrão + variações). */
export const procedureFormSchema = z
  .object({
    name: z.string().trim().min(2, 'Informe o nome'),
    code: z.string().trim().max(20, 'Máximo de 20 caracteres'),
    categoryId: z.string().min(1, 'Selecione a categoria'),
    price: z.string().refine(isValidPrice, 'Informe o valor, ex.: 150,00'),
    cost: z.string().refine((v) => !v.trim() || isValidPrice(v), 'Informe o custo, ex.: 25,00'),
    duration: z
      .string()
      .refine(
        (v) => !v || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 1440),
        'Minutos entre 1 e 1440',
      ),
    description: z.string(),
    preparation: z.string(),
    active: z.boolean(),
    variants: z.array(z.object({ species: z.string(), size: z.string(), price: z.string() })),
  })
  .superRefine((data, ctx) => {
    const seen = new Set<string>()
    data.variants.forEach((variant, index) => {
      if (!variant.species && !variant.size) {
        ctx.addIssue({
          code: 'custom',
          path: ['variants', index, 'species'],
          message: 'Escolha a espécie e/ou o porte',
        })
        return
      }
      const key = `${variant.species}|${variant.size}`
      if (seen.has(key)) {
        ctx.addIssue({
          code: 'custom',
          path: ['variants', index, 'species'],
          message: 'Variação repetida',
        })
      }
      seen.add(key)
      if (!isValidPrice(variant.price)) {
        ctx.addIssue({ code: 'custom', path: ['variants', index, 'price'], message: 'Informe o valor' })
      }
    })
  })

export type ProcedureFormValues = z.infer<typeof procedureFormSchema>
type VariantFormValue = ProcedureFormValues['variants'][number]

/** Converte a variação do formulário para o formato da API (null quando vazio). */
export function toVariantInput(v: VariantFormValue) {
  return {
    species: (v.species || null) as Species | null,
    size: (v.size || null) as Size | null,
    priceCents: inputToCents(v.price) ?? 0,
  }
}

export function toVariantFormValue(v: {
  species: string | null
  size: string | null
  priceCents: number
}): VariantFormValue {
  return { species: v.species ?? '', size: v.size ?? '', price: centsToInput(v.priceCents) }
}
