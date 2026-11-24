import { z } from "zod";
import { paginationSchema } from "../../lib/pagination.js";
import { optionalText } from "../../lib/validation.js";
import { SIZES, SPECIES } from "../patients/species.js";
import { variantKey } from "./pricing.js";

const priceCents = z
  .number("Informe o valor")
  .int("Valor inválido")
  .min(0, "O valor não pode ser negativo")
  .max(100_000_000, "Valor muito alto");

const priceVariantSchema = z
  .object({
    species: z.enum(SPECIES, "Espécie inválida").nullable(),
    size: z.enum(SIZES, "Porte inválido").nullable(),
    priceCents,
  })
  .refine((v) => v.species !== null || v.size !== null, {
    message: "Escolha a espécie e/ou o porte da variação",
    path: ["species"],
  });

export const categorySchema = z.object({
  name: z.string("Informe o nome").trim().min(2, "Informe o nome").max(60),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

export const procedureSchema = z.object({
  code: z
    .string()
    .trim()
    .max(20, "Máximo de 20 caracteres")
    .nullish()
    .transform((v) => v?.toUpperCase() || null),
  name: z.string("Informe o nome").trim().min(2, "Informe o nome").max(120),
  description: optionalText(1000),
  preparation: optionalText(1000),
  /** Valor padrão, usado quando nenhuma variação se aplica ao paciente */
  priceCents,
  /** Lista completa de variações (substitui as existentes) */
  prices: z
    .array(priceVariantSchema)
    .max(50, "Máximo de 50 variações")
    .default([])
    .refine((list) => new Set(list.map(variantKey)).size === list.length, {
      message: "Há variações repetidas (mesma espécie e porte)",
    }),
  /** Custo direto estimado por execução (materiais, terceiros); só o admin vê */
  costCents: z
    .number("Custo inválido")
    .int("Custo inválido")
    .min(0, "O custo não pode ser negativo")
    .max(100_000_000)
    .nullish()
    .transform((v) => v ?? null),
  durationMinutes: z
    .number("Duração inválida")
    .int("Informe minutos inteiros")
    .min(1, "Duração inválida")
    .max(24 * 60, "Máximo de 24 horas")
    .nullish()
    .transform((v) => v ?? null),
  categoryId: z.string("Selecione a categoria").min(1, "Selecione a categoria"),
  active: z.boolean().default(true),
});

export const listProceduresSchema = paginationSchema.extend({
  // O catálogo costuma ser consultado inteiro (ex.: tabela de preços impressa)
  pageSize: z.coerce.number().int().min(1).max(500).default(50),
  q: z.string().trim().max(100).optional(),
  categoryId: z.string().optional(),
  status: z.enum(["ativos", "inativos", "todos"]).default("ativos"),
});

export type CategoryInput = z.infer<typeof categorySchema>;
export type ProcedureInput = z.infer<typeof procedureSchema>;
export type ListProceduresQuery = z.infer<typeof listProceduresSchema>;
