export const SHIFT_KINDS = ["diurno", "noturno", "24h"] as const;
export type ShiftKind = (typeof SHIFT_KINDS)[number];

export const SHIFT_STATUSES = ["escalado", "falta"] as const;

/** Perfis que podem ser escalados (admin entra se tiver CRMV, como nos atendimentos). */
export const SHIFT_ROLES = ["veterinario", "enfermeiro"] as const;

export type ShiftState = "agendado" | "em_andamento" | "realizado" | "falta";

/** Situação derivada: só plantões terminados e sem falta contam como realizados (e como custo). */
export function shiftState(shift: { status: string; startsAt: Date; endsAt: Date }, now = new Date()): ShiftState {
  if (shift.status === "falta") return "falta";
  if (shift.endsAt <= now) return "realizado";
  if (shift.startsAt <= now) return "em_andamento";
  return "agendado";
}
