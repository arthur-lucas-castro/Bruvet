import { z } from "zod";
import { optionalText } from "../../lib/validation.js";
import { SHIFT_KINDS, SHIFT_STATUSES } from "./shift-kinds.js";

const HOUR = 3_600_000;
const MAX_SHIFT_HOURS = 36;

const cents = (message: string) =>
  z.number(message).int(message).min(0, message).max(100_000_000, "Valor muito alto");

const instant = (message: string) => z.coerce.date(message).refine((d) => !Number.isNaN(d.getTime()), message);

const slotSchema = z
  .object({ startsAt: instant("Início inválido"), endsAt: instant("Fim inválido") })
  .refine((s) => s.endsAt > s.startsAt, { message: "O fim precisa ser depois do início", path: ["endsAt"] })
  .refine((s) => s.endsAt.getTime() - s.startsAt.getTime() <= MAX_SHIFT_HOURS * HOUR, {
    message: `Um plantão pode ter no máximo ${MAX_SHIFT_HOURS} horas`,
    path: ["endsAt"],
  });

export const listShiftsSchema = z.object({
  from: instant("Data inicial inválida"),
  until: instant("Data final inválida"),
  userId: z.string().optional(),
});

export const periodSchema = z.object({
  from: instant("Data inicial inválida"),
  until: instant("Data final inválida"),
});

export const createShiftsSchema = z.object({
  userId: z.string("Selecione o profissional").min(1, "Selecione o profissional"),
  kind: z.enum(SHIFT_KINDS, "Selecione o tipo de plantão"),
  /** Um plantão por item (repetições já calculadas no navegador, no fuso local) */
  slots: z.array(slotSchema).min(1, "Informe ao menos uma data").max(62, "Máximo de 62 plantões por vez"),
  /** Ausente/null = valor padrão do profissional para o tipo */
  amountCents: cents("Valor inválido").nullish(),
  notes: optionalText(300),
});

export const updateShiftSchema = z
  .object({
    userId: z.string().min(1),
    kind: z.enum(SHIFT_KINDS, "Tipo inválido"),
    startsAt: instant("Início inválido"),
    endsAt: instant("Fim inválido"),
    amountCents: cents("Valor inválido"),
    status: z.enum(SHIFT_STATUSES, "Situação inválida"),
    notes: optionalText(300),
  })
  .partial();

export const payShiftsSchema = z.object({
  shiftIds: z.array(z.string()).min(1, "Selecione ao menos um plantão").max(500),
  notes: optionalText(300),
});

export const unpayShiftsSchema = z.object({
  shiftIds: z.array(z.string()).min(1, "Selecione ao menos um plantão").max(500),
});

const rate = cents("Valor inválido").nullable();
export const ratesSchema = z.object({ diurno: rate, noturno: rate, "24h": rate });

export { MAX_SHIFT_HOURS };
