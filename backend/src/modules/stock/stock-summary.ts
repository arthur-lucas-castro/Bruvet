import { EXPIRY_WARNING_DAYS, roundQuantity } from "./units.js";

const DAY = 86_400_000;

/** Meia-noite UTC de hoje: as validades são guardadas como data, sem hora. */
export function todayUtc(now = new Date()) {
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

/** Um lote vale até o fim do dia da validade. */
export const isExpired = (expiresAt: Date, today = todayUtc()) => expiresAt.getTime() < today.getTime();

export const isExpiringSoon = (expiresAt: Date, today = todayUtc()) =>
  !isExpired(expiresAt, today) && expiresAt.getTime() <= today.getTime() + EXPIRY_WARNING_DAYS * DAY;

export type StockStatus = "ok" | "baixo" | "sem_estoque";

type BatchLike = { quantity: number; expiresAt: Date };

/** Situação do estoque de um medicamento a partir dos seus lotes. */
export function summarizeStock(medication: { minStock: number; batches: BatchLike[] }) {
  const today = todayUtc();
  let available = 0;
  let expiredQuantity = 0;
  let nextExpiry: Date | null = null;
  let expiringSoon = false;

  for (const batch of medication.batches) {
    if (batch.quantity <= 0) continue;
    if (isExpired(batch.expiresAt, today)) {
      expiredQuantity += batch.quantity;
      continue;
    }
    available += batch.quantity;
    if (!nextExpiry || batch.expiresAt < nextExpiry) nextExpiry = batch.expiresAt;
    if (isExpiringSoon(batch.expiresAt, today)) expiringSoon = true;
  }

  available = roundQuantity(available);
  const status: StockStatus =
    available === 0 ? "sem_estoque" : available <= medication.minStock ? "baixo" : "ok";

  return {
    /** Saldo utilizável (lotes dentro da validade) */
    available,
    /** Saldo parado em lotes vencidos, aguardando descarte */
    expiredQuantity: roundQuantity(expiredQuantity),
    nextExpiry,
    expiringSoon,
    status,
    /** Abaixo do mínimo configurado (só alerta quando há mínimo definido) */
    belowMinimum: medication.minStock > 0 && available <= medication.minStock,
  };
}
