/**
 * Cálculo da comanda. Função pura usada pela comanda e pelo financeiro, para que
 * os valores mostrados ao tutor e os relatórios do admin sejam sempre os mesmos.
 */

export const PAYMENT_METHODS = ["dinheiro", "pix", "debito", "credito", "outro"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type BillStatus = "aberta" | "paga" | "cancelada";

type ProcedureLine = { priceCents: number; quantity: number };
type MovementLine = {
  type: string;
  quantity: number;
  salePriceCents: number | null;
  reversedBy: { id: string } | null;
};
type ExtraLine = { unitPriceCents: number; quantity: number };
type PaymentLine = { amountCents: number; voidedAt: Date | null };

export type BillTotalsInput = {
  attendanceStatus: string;
  discountCents: number;
  procedures: ProcedureLine[];
  stockMovements: MovementLine[];
  items: ExtraLine[];
  payments: PaymentLine[];
};

/** Saídas de medicamento cobradas na comanda: não estornadas e com preço de venda. */
export const isChargedMedication = (m: MovementLine) =>
  m.type === "saida" && !m.reversedBy && m.salePriceCents != null;

export const medicationLineTotal = (m: { quantity: number; salePriceCents: number | null }) =>
  Math.round(-m.quantity * (m.salePriceCents ?? 0));

export function computeBillTotals(input: BillTotalsInput) {
  const proceduresCents = input.procedures.reduce((sum, p) => sum + p.priceCents * p.quantity, 0);
  const medicationsCents = input.stockMovements
    .filter(isChargedMedication)
    .reduce((sum, m) => sum + medicationLineTotal(m), 0);
  const extrasCents = input.items.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0);

  const subtotalCents = proceduresCents + medicationsCents + extrasCents;
  // O desconto nunca passa do subtotal (ex.: um procedimento removido depois do desconto)
  const discountCents = Math.min(input.discountCents, subtotalCents);
  const totalCents = subtotalCents - discountCents;
  const paidCents = input.payments
    .filter((p) => !p.voidedAt)
    .reduce((sum, p) => sum + p.amountCents, 0);
  const balanceCents = totalCents - paidCents;

  let status: BillStatus;
  if (input.attendanceStatus === "cancelado") status = "cancelada";
  else if (totalCents > 0 && balanceCents <= 0) status = "paga";
  // Atendimento finalizado sem nada a cobrar (ex.: retorno gratuito) não fica pendente
  else if (totalCents === 0 && input.attendanceStatus === "finalizado") status = "paga";
  else status = "aberta";

  return {
    proceduresCents,
    medicationsCents,
    extrasCents,
    subtotalCents,
    discountCents,
    totalCents,
    paidCents,
    balanceCents,
    status,
  };
}

export type BillTotals = ReturnType<typeof computeBillTotals>;
