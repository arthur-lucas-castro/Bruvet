import { z } from "zod";
import { paginationSchema } from "../../lib/pagination.js";
import { optionalText } from "../../lib/validation.js";
import { PAYMENT_METHODS } from "./bill-totals.js";

const cents = (message: string) =>
  z.number(message).int(message).min(0, message).max(100_000_000, "Valor muito alto");

export const listBillsSchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  status: z.enum(["aberta", "paga", "cancelada", "todas"]).default("aberta"),
  tutorId: z.string().optional(),
});

export const billItemSchema = z.object({
  description: z.string("Descreva o item").trim().min(2, "Descreva o item").max(120),
  quantity: z.number().int("Quantidade inteira").min(1, "Mínimo 1").max(1000).default(1),
  unitPriceCents: cents("Informe o valor").refine((v) => v > 0, "O valor precisa ser maior que zero"),
});

export const discountSchema = z
  .object({
    /** 0 remove o desconto */
    amountCents: cents("Desconto inválido"),
    reason: optionalText(300),
  })
  .refine((d) => d.amountCents === 0 || d.reason, {
    message: "Informe o motivo do desconto",
    path: ["reason"],
  });

const paymentFields = {
  method: z.enum(PAYMENT_METHODS, "Selecione a forma de pagamento"),
  installments: z
    .number()
    .int()
    .min(1)
    .max(24, "Máximo de 24 parcelas")
    .nullish()
    .transform((v) => v ?? null),
  notes: optionalText(300),
};

export const paymentSchema = z.object({
  amountCents: cents("Informe o valor").refine((v) => v > 0, "O valor precisa ser maior que zero"),
  ...paymentFields,
});

/** Quitar várias comandas do mesmo tutor de uma vez (cada uma recebe o próprio saldo). */
export const payManySchema = z.object({
  billIds: z.array(z.string().min(1)).min(1, "Selecione as comandas").max(30),
  ...paymentFields,
});

export const voidPaymentSchema = z.object({
  reason: z.string("Informe o motivo").trim().min(3, "Informe o motivo").max(300),
});

export type ListBillsQuery = z.infer<typeof listBillsSchema>;
