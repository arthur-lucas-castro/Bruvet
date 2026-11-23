import { z } from "zod";
import { paginationSchema } from "../../lib/pagination.js";
import { dateOnly, optionalText } from "../../lib/validation.js";
import { UNITS, roundQuantity } from "./units.js";

const quantity = (message = "Informe a quantidade") =>
  z
    .number(message)
    .max(1_000_000, "Quantidade muito alta")
    .refine((v) => Math.abs(roundQuantity(v) - v) < 1e-9, "Use no máximo 3 casas decimais")
    .transform(roundQuantity);

export const medicationSchema = z.object({
  name: z.string("Informe o nome").trim().min(2, "Informe o nome").max(120),
  activeIngredient: optionalText(120),
  presentation: optionalText(60),
  concentration: optionalText(60),
  manufacturer: optionalText(80),
  unit: z.enum(UNITS, "Selecione a unidade"),
  minStock: quantity("Estoque mínimo inválido").pipe(z.number().min(0, "Não pode ser negativo")).default(0),
  controlled: z.boolean().default(false),
  notes: optionalText(1000),
  active: z.boolean().default(true),
});

export const listMedicationsSchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  /** Filtra pela situação do estoque */
  status: z.enum(["todos", "baixo", "vencendo", "vencido"]).default("todos"),
  situacao: z.enum(["ativos", "inativos", "todos"]).default("ativos"),
});

export const entrySchema = z.object({
  batchNumber: z
    .string("Informe o lote")
    .trim()
    .min(1, "Informe o lote")
    .max(40)
    .transform((v) => v.toUpperCase()),
  expiresAt: dateOnly(),
  quantity: quantity().pipe(z.number().positive("A quantidade precisa ser maior que zero")),
  unitCostCents: z
    .number("Custo inválido")
    .int()
    .min(0, "Custo inválido")
    .max(100_000_000)
    .nullish()
    .transform((v) => v ?? null),
  supplier: optionalText(80),
  reason: optionalText(500),
});

export const exitSchema = z.object({
  quantity: quantity().pipe(z.number().positive("A quantidade precisa ser maior que zero")),
  /** Lote específico; ausente = sai do lote que vence primeiro */
  batchId: z.string().min(1).nullish(),
  patientId: z.string().min(1).nullish(),
  reason: optionalText(500),
});

export const adjustSchema = z
  .object({
    /** ajuste = contagem de inventário (informa o saldo correto); perda = descarte/avaria */
    type: z.enum(["ajuste", "perda"], "Tipo inválido"),
    quantity: quantity().pipe(z.number().min(0, "Não pode ser negativo")),
    reason: z.string("Informe o motivo").trim().min(3, "Informe o motivo").max(500),
  })
  .refine((d) => d.type !== "perda" || d.quantity > 0, {
    message: "A quantidade perdida precisa ser maior que zero",
    path: ["quantity"],
  });

export type MedicationInput = z.infer<typeof medicationSchema>;
export type ListMedicationsQuery = z.infer<typeof listMedicationsSchema>;
export type EntryInput = z.infer<typeof entrySchema>;
export type ExitInput = z.infer<typeof exitSchema>;
export type AdjustInput = z.infer<typeof adjustSchema>;
