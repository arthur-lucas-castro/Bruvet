import { randomUUID } from "node:crypto";
import type { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../../lib/app-error.js";
import { toSkipTake } from "../../lib/pagination.js";
import { prisma } from "../../lib/prisma.js";
import { searchTerms } from "../../lib/search.js";
import type { PublicUser } from "../users/users.presenter.js";
import { settingsService } from "../settings/settings.service.js";
import { computeBillTotals } from "./bill-totals.js";
import type { z } from "zod";
import type {
  billItemSchema,
  discountSchema,
  ListBillsQuery,
  payManySchema,
  paymentSchema,
} from "./billing.schemas.js";

type Tx = Prisma.TransactionClient;
type ItemInput = z.infer<typeof billItemSchema>;
type DiscountInput = z.infer<typeof discountSchema>;
type PaymentInput = z.infer<typeof paymentSchema>;
type PayManyInput = z.infer<typeof payManySchema>;

const userRef = { select: { id: true, name: true } } as const;

export const billInclude = {
  attendance: {
    select: {
      id: true,
      code: true,
      kind: true,
      status: true,
      startedAt: true,
      finishedAt: true,
      patient: {
        select: {
          id: true,
          name: true,
          code: true,
          species: true,
          tutor: { select: { id: true, name: true, phone: true, cpf: true } },
        },
      },
      veterinarian: userRef,
      procedures: {
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, priceCents: true, quantity: true, species: true, size: true },
      },
      stockMovements: {
        where: { type: "saida" },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          type: true,
          quantity: true,
          salePriceCents: true,
          reversedBy: { select: { id: true } },
          medication: { select: { id: true, name: true, unit: true } },
        },
      },
    },
  },
  items: { orderBy: { createdAt: "asc" }, include: { addedBy: userRef } },
  payments: { orderBy: { receivedAt: "asc" }, include: { receivedBy: userRef, voidedBy: userRef } },
  discountBy: userRef,
} satisfies Prisma.BillInclude;

type BillWithDetails = Prisma.BillGetPayload<{ include: typeof billInclude }>;

const totalsOf = (bill: BillWithDetails) =>
  computeBillTotals({
    attendanceStatus: bill.attendance.status,
    discountCents: bill.discountCents,
    procedures: bill.attendance.procedures,
    stockMovements: bill.attendance.stockMovements,
    items: bill.items,
    payments: bill.payments,
  });

function present(bill: BillWithDetails) {
  const totals = totalsOf(bill);
  return {
    ...bill,
    // Só as saídas cobradas aparecem como linha da comanda
    attendance: {
      ...bill.attendance,
      stockMovements: bill.attendance.stockMovements.filter((m) => !m.reversedBy && m.salePriceCents != null),
    },
    totals,
  };
}

async function loadOrFail(id: string, tx: Tx = prisma) {
  const bill = await tx.bill.findUnique({ where: { id }, include: billInclude });
  if (!bill) throw new AppError("Comanda não encontrada", 404);
  return bill;
}

/** Trava a linha da comanda até o fim da transação (evita dois pagamentos acima do saldo). */
async function lockBill(id: string, tx: Tx) {
  await tx.$queryRaw`SELECT "id" FROM "bills" WHERE "id" = ${id} FOR UPDATE`;
}

/** Grava status e data de quitação conforme os totais atuais. */
async function syncStatus(bill: BillWithDetails, tx: Tx = prisma) {
  const { status } = totalsOf(bill);
  const paidAt = status === "paga" ? (bill.paidAt ?? new Date()) : null;
  if (status !== bill.status || paidAt?.getTime() !== bill.paidAt?.getTime()) {
    await tx.bill.update({ where: { id: bill.id }, data: { status, paidAt } });
  }
}

function assertNotCancelled(bill: BillWithDetails) {
  if (bill.attendance.status === "cancelado") {
    throw new AppError("Atendimento cancelado: a comanda não aceita alterações.", 409, "BILL_CANCELLED");
  }
}

const formatBRL = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const billingService = {
  /** Recalcula a situação da comanda de um atendimento (chamado após mudanças no atendimento). */
  async syncByAttendance(attendanceId: string) {
    const bill = await prisma.bill.findUnique({ where: { attendanceId }, include: billInclude });
    if (bill) await syncStatus(bill);
  },

  async list({ q, status, tutorId, ...pagination }: ListBillsQuery) {
    const where: Prisma.BillWhereInput = {
      status: status === "todas" ? undefined : status,
      attendance: tutorId ? { patient: { tutorId } } : undefined,
      AND: searchTerms(q).map((term) => {
        const code = /^\d+$/.test(term) ? Number(term) : undefined;
        return {
          OR: [
            { attendance: { patient: { searchText: { contains: term } } } },
            { attendance: { patient: { tutor: { searchText: { contains: term } } } } },
            ...(code !== undefined ? [{ attendance: { code } }] : []),
          ],
        };
      }),
    };
    const [bills, total] = await Promise.all([
      prisma.bill.findMany({
        where,
        orderBy: { attendance: { startedAt: "desc" } },
        ...toSkipTake(pagination),
        include: billInclude,
      }),
      prisma.bill.count({ where }),
    ]);
    return { items: bills.map(present), total, ...pagination };
  },

  async get(id: string) {
    return present(await loadOrFail(id));
  },

  async getByAttendance(attendanceId: string) {
    const bill = await prisma.bill.findUnique({ where: { attendanceId }, select: { id: true } });
    if (!bill) throw new AppError("Comanda não encontrada", 404);
    return this.get(bill.id);
  },

  // ---------- Itens avulsos ----------

  async addItem(id: string, input: ItemInput, actorId: string) {
    return prisma.$transaction(async (tx) => {
      await lockBill(id, tx);
      assertNotCancelled(await loadOrFail(id, tx));
      await tx.billItem.create({ data: { ...input, billId: id, addedById: actorId } });
      const updated = await loadOrFail(id, tx);
      await syncStatus(updated, tx);
      return present(await loadOrFail(id, tx));
    });
  },

  async removeItem(id: string, itemId: string) {
    return prisma.$transaction(async (tx) => {
      await lockBill(id, tx);
      const bill = await loadOrFail(id, tx);
      assertNotCancelled(bill);
      const item = bill.items.find((i) => i.id === itemId);
      if (!item) throw new AppError("Item não encontrado", 404);

      const totals = totalsOf(bill);
      if (totals.totalCents - item.unitPriceCents * item.quantity < totals.paidCents) {
        throw new AppError(
          "Remover este item deixaria a comanda com valor menor que o já pago. Estorne um pagamento antes.",
          409,
          "BELOW_PAID",
        );
      }
      await tx.billItem.delete({ where: { id: itemId } });
      const updated = await loadOrFail(id, tx);
      await syncStatus(updated, tx);
      return present(updated);
    });
  },

  // ---------- Desconto ----------

  /** Veterinário e recepção têm limite (% do subtotal); o admin pode qualquer valor. */
  async setDiscount(id: string, input: DiscountInput, actor: PublicUser) {
    const limitPercent = await settingsService.discountLimitPercent();
    return prisma.$transaction(async (tx) => {
      await lockBill(id, tx);
      const bill = await loadOrFail(id, tx);
      assertNotCancelled(bill);
      const totals = totalsOf(bill);

      if (input.amountCents > totals.subtotalCents) {
        throw new AppError("O desconto não pode ser maior que o subtotal.", 400, "DISCOUNT_TOO_HIGH");
      }
      const limitCents = Math.floor((totals.subtotalCents * limitPercent) / 100);
      if (actor.role !== "admin" && input.amountCents > limitCents) {
        throw new AppError(
          `Seu limite de desconto é ${limitPercent}% (${formatBRL(limitCents)} nesta comanda). Acima disso, peça a um administrador.`,
          403,
          "DISCOUNT_LIMIT",
        );
      }
      if (totals.subtotalCents - input.amountCents < totals.paidCents) {
        throw new AppError(
          "Com este desconto a comanda ficaria menor que o valor já pago.",
          409,
          "BELOW_PAID",
        );
      }

      const removing = input.amountCents === 0;
      await tx.bill.update({
        where: { id },
        data: {
          discountCents: input.amountCents,
          discountReason: removing ? null : input.reason,
          discountById: removing ? null : actor.id,
          discountAt: removing ? null : new Date(),
        },
      });
      const updated = await loadOrFail(id, tx);
      await syncStatus(updated, tx);
      return present(await loadOrFail(id, tx));
    });
  },

  // ---------- Pagamentos ----------

  async pay(id: string, input: PaymentInput, actorId: string) {
    return prisma.$transaction(async (tx) => {
      await lockBill(id, tx);
      const bill = await loadOrFail(id, tx);
      assertNotCancelled(bill);
      const { balanceCents } = totalsOf(bill);
      if (balanceCents <= 0) throw new AppError("Esta comanda não tem saldo a pagar.", 409, "NOTHING_DUE");
      if (input.amountCents > balanceCents) {
        throw new AppError(
          `O valor é maior que o saldo da comanda (${formatBRL(balanceCents)}).`,
          400,
          "ABOVE_BALANCE",
        );
      }
      await tx.payment.create({
        data: {
          billId: id,
          amountCents: input.amountCents,
          method: input.method,
          installments: input.method === "credito" ? input.installments : null,
          notes: input.notes,
          receivedById: actorId,
        },
      });
      const updated = await loadOrFail(id, tx);
      await syncStatus(updated, tx);
      return present(await loadOrFail(id, tx));
    });
  },

  /** Quita de uma vez várias comandas do mesmo tutor: cada uma recebe um pagamento do seu saldo. */
  async payMany(input: PayManyInput, actorId: string) {
    const ids = [...new Set(input.billIds)];
    return prisma.$transaction(async (tx) => {
      // Dentro de uma transação as consultas precisam ser sequenciais (mesma conexão)
      for (const id of [...ids].sort()) await lockBill(id, tx);
      const bills = [];
      for (const id of ids) bills.push(await loadOrFail(id, tx));

      const tutors = new Set(bills.map((b) => b.attendance.patient.tutor.id));
      if (tutors.size > 1) {
        throw new AppError("Só é possível quitar juntas comandas do mesmo tutor.", 400, "MIXED_TUTORS");
      }
      const groupId = randomUUID();
      for (const bill of bills) {
        assertNotCancelled(bill);
        const { balanceCents } = totalsOf(bill);
        if (balanceCents <= 0) {
          throw new AppError(
            `A comanda do atendimento nº ${String(bill.attendance.code).padStart(6, "0")} não tem saldo.`,
            409,
            "NOTHING_DUE",
          );
        }
        await tx.payment.create({
          data: {
            billId: bill.id,
            amountCents: balanceCents,
            method: input.method,
            installments: input.method === "credito" ? input.installments : null,
            notes: input.notes,
            groupId,
            receivedById: actorId,
          },
        });
        await syncStatus(await loadOrFail(bill.id, tx), tx);
      }
      const result = [];
      for (const id of ids) result.push(present(await loadOrFail(id, tx)));
      return result;
    });
  },

  /** Estorno de pagamento (somente admin): o registro fica, marcado como estornado. */
  async voidPayment(paymentId: string, reason: string, actorId: string) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new AppError("Pagamento não encontrado", 404);
    if (payment.voidedAt) throw new AppError("Este pagamento já foi estornado.", 409, "ALREADY_VOIDED");

    return prisma.$transaction(async (tx) => {
      await lockBill(payment.billId, tx);
      await tx.payment.update({
        where: { id: paymentId },
        data: { voidedAt: new Date(), voidedById: actorId, voidReason: reason },
      });
      const updated = await loadOrFail(payment.billId, tx);
      await syncStatus(updated, tx);
      return present(await loadOrFail(payment.billId, tx));
    });
  },
};
