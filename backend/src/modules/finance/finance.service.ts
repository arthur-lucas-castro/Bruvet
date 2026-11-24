import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { computeBillTotals, isChargedMedication, medicationLineTotal } from "../billing/bill-totals.js";
import { isExpired, todayUtc } from "../stock/stock-summary.js";

/**
 * Indicadores financeiros (somente admin).
 * - Receita e custos diretos são apurados pela data de INÍCIO do atendimento.
 * - Recebimentos, pela data do pagamento.
 * - Perdas e uso interno de estoque, pela data da movimentação.
 * - "A receber" considera todas as comandas abertas, de qualquer data.
 */
export const financeQuerySchema = z.object({
  from: z.coerce.date("Data inicial inválida"),
  until: z.coerce.date("Data final inválida"),
});

type Query = z.infer<typeof financeQuerySchema>;

const TIMEZONE = "America/Sao_Paulo";
const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" });
const DAY = 86_400_000;

type Bucket = { key: string; revenueCents: number; costCents: number; receivedCents: number };

const movementCost = (m: { quantity: number; unitCostCents: number | null }) =>
  Math.round(Math.abs(m.quantity) * (m.unitCostCents ?? 0));

export const financeService = {
  async summary({ from, until }: Query) {
    const range = { gte: from, lt: until };
    // Até ~2 meses: série diária; acima disso, mensal
    const monthly = until.getTime() - from.getTime() > 62 * DAY;
    const bucketOf = (date: Date) => {
      const key = dayKey.format(date);
      return monthly ? key.slice(0, 7) : key;
    };

    const [attendances, payments, otherMovements, openBills, batches] = await Promise.all([
      prisma.attendance.findMany({
        where: { startedAt: range, status: { not: "cancelado" } },
        select: {
          id: true,
          code: true,
          startedAt: true,
          status: true,
          veterinarian: { select: { id: true, name: true } },
          patient: { select: { id: true, name: true, species: true } },
          procedures: {
            select: {
              procedureId: true,
              name: true,
              priceCents: true,
              costCents: true,
              quantity: true,
              procedure: { select: { category: { select: { id: true, name: true } } } },
            },
          },
          stockMovements: {
            where: { type: "saida" },
            select: {
              type: true,
              quantity: true,
              unitCostCents: true,
              salePriceCents: true,
              reversedBy: { select: { id: true } },
            },
          },
          bill: {
            select: {
              id: true,
              discountCents: true,
              discountReason: true,
              discountAt: true,
              discountBy: { select: { id: true, name: true } },
              items: { select: { unitPriceCents: true, quantity: true } },
              payments: { select: { amountCents: true, voidedAt: true } },
            },
          },
        },
      }),
      prisma.payment.findMany({
        where: { receivedAt: range, voidedAt: null },
        select: { amountCents: true, method: true, receivedAt: true },
      }),
      prisma.stockMovement.findMany({
        // Perdas e saídas fora de atendimento (uso interno) no período
        where: {
          createdAt: range,
          OR: [{ type: "perda" }, { type: "saida", attendanceId: null, reversedBy: null }],
        },
        select: { type: true, quantity: true, unitCostCents: true },
      }),
      prisma.bill.findMany({
        where: { status: "aberta" },
        select: {
          discountCents: true,
          createdAt: true,
          items: { select: { unitPriceCents: true, quantity: true } },
          payments: { select: { amountCents: true, voidedAt: true } },
          attendance: {
            select: {
              status: true,
              procedures: { select: { priceCents: true, quantity: true } },
              stockMovements: {
                where: { type: "saida" },
                select: { type: true, quantity: true, salePriceCents: true, reversedBy: { select: { id: true } } },
              },
            },
          },
        },
      }),
      prisma.stockBatch.findMany({
        where: { quantity: { gt: 0 } },
        select: { quantity: true, unitCostCents: true, expiresAt: true },
      }),
    ]);

    // ---------- Receita e custos dos atendimentos do período ----------
    const totals = {
      revenueCents: 0,
      discountCents: 0,
      medicationCostCents: 0,
      procedureCostCents: 0,
      attendances: attendances.length,
    };
    const quality = { proceduresWithoutCost: 0, medicationsWithoutCost: 0 };
    const buckets = new Map<string, Bucket>();
    const bucket = (key: string) => {
      let b = buckets.get(key);
      if (!b) buckets.set(key, (b = { key, revenueCents: 0, costCents: 0, receivedCents: 0 }));
      return b;
    };

    type Row = { id: string; name: string; revenueCents: number; costCents: number; count: number };
    const byCategory = new Map<string, Row>();
    const byProcedure = new Map<string, Row>();
    const byVet = new Map<string, Row>();
    const bySpecies = new Map<string, Row>();
    const addTo = (map: Map<string, Row>, id: string, name: string, revenue: number, cost: number, count = 1) => {
      const row = map.get(id) ?? { id, name, revenueCents: 0, costCents: 0, count: 0 };
      row.revenueCents += revenue;
      row.costCents += cost;
      row.count += count;
      map.set(id, row);
    };

    let chargedMedicationsRevenue = 0;
    let extrasRevenue = 0;
    const discounts: {
      attendanceId: string;
      attendanceCode: number;
      patientName: string;
      amountCents: number;
      reason: string | null;
      by: string | null;
      at: Date | null;
    }[] = [];

    for (const a of attendances) {
      const bill = a.bill;
      const billTotals = computeBillTotals({
        attendanceStatus: a.status,
        discountCents: bill?.discountCents ?? 0,
        procedures: a.procedures,
        stockMovements: a.stockMovements,
        items: bill?.items ?? [],
        payments: bill?.payments ?? [],
      });

      const activeMeds = a.stockMovements.filter((m) => m.type === "saida" && !m.reversedBy);
      const medCost = activeMeds.reduce((sum, m) => sum + movementCost(m), 0);
      quality.medicationsWithoutCost += activeMeds.filter((m) => m.unitCostCents == null).length;
      const procCost = a.procedures.reduce((sum, p) => sum + (p.costCents ?? 0) * p.quantity, 0);
      quality.proceduresWithoutCost += a.procedures.filter((p) => p.costCents == null).length;

      totals.revenueCents += billTotals.totalCents;
      totals.discountCents += billTotals.discountCents;
      totals.medicationCostCents += medCost;
      totals.procedureCostCents += procCost;

      const b = bucket(bucketOf(a.startedAt));
      b.revenueCents += billTotals.totalCents;
      b.costCents += medCost + procCost;

      for (const p of a.procedures) {
        const revenue = p.priceCents * p.quantity;
        const cost = (p.costCents ?? 0) * p.quantity;
        const category = p.procedure.category;
        addTo(byCategory, category.id, category.name, revenue, cost, p.quantity);
        addTo(byProcedure, p.procedureId, p.name, revenue, cost, p.quantity);
      }
      chargedMedicationsRevenue += a.stockMovements.filter(isChargedMedication).reduce((s, m) => s + medicationLineTotal(m), 0);
      extrasRevenue += billTotals.extrasCents;

      addTo(byVet, a.veterinarian.id, a.veterinarian.name, billTotals.totalCents, medCost + procCost);
      addTo(bySpecies, a.patient.species, a.patient.species, billTotals.totalCents, medCost + procCost);

      if (billTotals.discountCents > 0 && bill) {
        discounts.push({
          attendanceId: a.id,
          attendanceCode: a.code,
          patientName: a.patient.name,
          amountCents: billTotals.discountCents,
          reason: bill.discountReason,
          by: bill.discountBy?.name ?? null,
          at: bill.discountAt,
        });
      }
    }

    // Linhas que fecham a conta da receita: medicamentos cobrados, itens avulsos e descontos.
    // O custo de todos os medicamentos usados em atendimentos fica na linha "Medicamentos".
    const categoryRows = [
      ...byCategory.values(),
      {
        id: "medicamentos",
        name: "Medicamentos (cobrados e insumos)",
        revenueCents: chargedMedicationsRevenue,
        costCents: totals.medicationCostCents,
        count: 0,
      },
      { id: "avulsos", name: "Itens avulsos da comanda", revenueCents: extrasRevenue, costCents: 0, count: 0 },
      { id: "descontos", name: "Descontos concedidos", revenueCents: -totals.discountCents, costCents: 0, count: 0 },
    ].filter((r) => r.revenueCents !== 0 || r.costCents !== 0);

    // ---------- Recebimentos ----------
    const byMethod = new Map<string, number>();
    let receivedCents = 0;
    for (const p of payments) {
      receivedCents += p.amountCents;
      byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + p.amountCents);
      bucket(bucketOf(p.receivedAt)).receivedCents += p.amountCents;
    }

    // ---------- Outros custos de estoque no período ----------
    let lossCostCents = 0;
    let internalUseCostCents = 0;
    for (const m of otherMovements) {
      if (m.type === "perda") lossCostCents += movementCost(m);
      else internalUseCostCents += movementCost(m);
    }

    // ---------- A receber (todas as comandas abertas) ----------
    let receivableCents = 0;
    let receivableBills = 0;
    let oldestOpen: Date | null = null;
    for (const bill of openBills) {
      const t = computeBillTotals({
        attendanceStatus: bill.attendance.status,
        discountCents: bill.discountCents,
        procedures: bill.attendance.procedures,
        stockMovements: bill.attendance.stockMovements,
        items: bill.items,
        payments: bill.payments,
      });
      if (t.balanceCents > 0) {
        receivableCents += t.balanceCents;
        receivableBills++;
        if (!oldestOpen || bill.createdAt < oldestOpen) oldestOpen = bill.createdAt;
      }
    }

    // ---------- Estoque (agora) ----------
    const today = todayUtc();
    let stockValueCents = 0;
    let expiredStockValueCents = 0;
    let batchesWithoutCost = 0;
    for (const b of batches) {
      if (b.unitCostCents == null) {
        batchesWithoutCost++;
        continue;
      }
      const value = Math.round(b.quantity * b.unitCostCents);
      if (isExpired(b.expiresAt, today)) expiredStockValueCents += value;
      else stockValueCents += value;
    }

    const directCostCents = totals.medicationCostCents + totals.procedureCostCents;
    const grossMarginCents = totals.revenueCents - directCostCents;
    const withMargin = (r: Row) => ({ ...r, marginCents: r.revenueCents - r.costCents });
    const byRevenue = (a: { revenueCents: number }, b: { revenueCents: number }) => b.revenueCents - a.revenueCents;

    return {
      period: { from, until, granularity: monthly ? "mes" : "dia" },
      kpis: {
        revenueCents: totals.revenueCents,
        receivedCents,
        receivableCents,
        receivableBills,
        oldestOpenBillAt: oldestOpen,
        directCostCents,
        medicationCostCents: totals.medicationCostCents,
        procedureCostCents: totals.procedureCostCents,
        grossMarginCents,
        grossMarginPercent: totals.revenueCents > 0 ? (grossMarginCents / totals.revenueCents) * 100 : null,
        attendances: totals.attendances,
        averageTicketCents: totals.attendances > 0 ? Math.round(totals.revenueCents / totals.attendances) : 0,
        discountCents: totals.discountCents,
        lossCostCents,
        internalUseCostCents,
      },
      series: [...buckets.values()].sort((a, b) => a.key.localeCompare(b.key)),
      categories: categoryRows.map(withMargin).sort(byRevenue),
      topProcedures: [...byProcedure.values()].map(withMargin).sort(byRevenue).slice(0, 10),
      veterinarians: [...byVet.values()].map(withMargin).sort(byRevenue),
      species: [...bySpecies.values()].map(withMargin).sort(byRevenue),
      paymentMethods: [...byMethod.entries()]
        .map(([method, amountCents]) => ({ method, amountCents }))
        .sort((a, b) => b.amountCents - a.amountCents),
      discounts: discounts.sort((a, b) => b.amountCents - a.amountCents),
      stock: { valueCents: stockValueCents, expiredValueCents: expiredStockValueCents, batchesWithoutCost },
      dataQuality: quality,
    };
  },
};
