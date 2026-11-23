import type { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../../lib/app-error.js";
import { toSkipTake, type Pagination } from "../../lib/pagination.js";
import { prisma } from "../../lib/prisma.js";
import { buildSearchText, searchTerms } from "../../lib/search.js";
import type {
  AdjustInput,
  EntryInput,
  ExitInput,
  ListMedicationsQuery,
  MedicationInput,
} from "./stock.schemas.js";
import { isExpired, isExpiringSoon, summarizeStock, todayUtc } from "./stock-summary.js";
import { roundQuantity } from "./units.js";

type Tx = Prisma.TransactionClient;

const medicationSearchText = (input: MedicationInput) =>
  buildSearchText(input.name, input.activeIngredient, input.manufacturer, input.concentration);

const withSummary = <T extends { minStock: number; batches: { quantity: number; expiresAt: Date }[] }>(
  medication: T,
) => ({ ...medication, stock: summarizeStock(medication) });

async function findMedicationOrFail(id: string, tx: Tx = prisma) {
  const medication = await tx.medication.findUnique({ where: { id } });
  if (!medication) throw new AppError("Medicamento não encontrado", 404);
  return medication;
}

const formatQty = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 3 });

export const stockService = {
  // ---------- Medicamentos ----------

  /**
   * A situação do estoque depende da soma dos lotes, então o filtro por situação é
   * feito em memória. Atende bem catálogos de alguns milhares de itens.
   */
  async list({ q, status, situacao, ...pagination }: ListMedicationsQuery) {
    const medications = await prisma.medication.findMany({
      where: {
        active: situacao === "ativos" ? true : situacao === "inativos" ? false : undefined,
        AND: searchTerms(q).map((term) => ({ searchText: { contains: term } })),
      },
      orderBy: { name: "asc" },
      include: {
        batches: { where: { quantity: { gt: 0 } }, select: { quantity: true, expiresAt: true } },
      },
    });

    const filtered = medications.map(withSummary).filter(({ stock }) => {
      if (status === "baixo") return stock.status !== "ok";
      if (status === "vencendo") return stock.expiringSoon;
      if (status === "vencido") return stock.expiredQuantity > 0;
      return true;
    });

    const { skip, take } = toSkipTake(pagination);
    const items = filtered.slice(skip, skip + take).map(({ batches: _batches, ...rest }) => rest);
    return { items, total: filtered.length, ...pagination };
  },

  async get(id: string) {
    const medication = await prisma.medication.findUnique({
      where: { id },
      include: { batches: { orderBy: [{ expiresAt: "asc" }, { batchNumber: "asc" }] } },
    });
    if (!medication) throw new AppError("Medicamento não encontrado", 404);

    const today = todayUtc();
    return {
      ...withSummary(medication),
      batches: medication.batches.map((batch) => ({
        ...batch,
        expired: isExpired(batch.expiresAt, today),
        expiringSoon: isExpiringSoon(batch.expiresAt, today),
      })),
    };
  },

  create(input: MedicationInput) {
    return prisma.medication.create({ data: { ...input, searchText: medicationSearchText(input) } });
  },

  async update(id: string, input: MedicationInput) {
    const current = await findMedicationOrFail(id);
    if (current.unit !== input.unit) {
      const movements = await prisma.stockMovement.count({ where: { medicationId: id } });
      if (movements > 0) {
        throw new AppError(
          "A unidade não pode ser alterada depois que há movimentações de estoque.",
          409,
          "UNIT_LOCKED",
        );
      }
    }
    return prisma.medication.update({
      where: { id },
      data: { ...input, searchText: medicationSearchText(input) },
    });
  },

  async movements(id: string, pagination: Pagination) {
    await findMedicationOrFail(id);
    const where = { medicationId: id };
    const [items, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...toSkipTake(pagination),
        include: {
          batch: { select: { id: true, batchNumber: true } },
          user: { select: { id: true, name: true } },
          patient: { select: { id: true, name: true, code: true } },
          attendance: { select: { id: true, code: true } },
        },
      }),
      prisma.stockMovement.count({ where }),
    ]);
    return { items, total, ...pagination };
  },

  // ---------- Movimentações ----------

  /** Entrada: soma ao lote informado, criando-o se for novo. */
  async entry(medicationId: string, input: EntryInput, userId: string) {
    if (isExpired(input.expiresAt)) {
      throw new AppError("Este lote já está vencido e não pode entrar no estoque.", 400, "BATCH_EXPIRED");
    }

    return prisma.$transaction(async (tx) => {
      await findMedicationOrFail(medicationId, tx);

      const existing = await tx.stockBatch.findUnique({
        where: { medicationId_batchNumber: { medicationId, batchNumber: input.batchNumber } },
      });
      if (existing && existing.expiresAt.getTime() !== input.expiresAt.getTime()) {
        throw new AppError(
          `O lote ${input.batchNumber} já está cadastrado com outra validade. Confira o lote e a validade.`,
          409,
          "BATCH_EXPIRY_MISMATCH",
        );
      }

      const batch = existing
        ? await tx.stockBatch.update({
            where: { id: existing.id },
            data: {
              quantity: roundQuantity(existing.quantity + input.quantity),
              unitCostCents: input.unitCostCents ?? existing.unitCostCents,
              supplier: input.supplier ?? existing.supplier,
            },
          })
        : await tx.stockBatch.create({
            data: {
              medicationId,
              batchNumber: input.batchNumber,
              expiresAt: input.expiresAt,
              quantity: input.quantity,
              unitCostCents: input.unitCostCents,
              supplier: input.supplier,
            },
          });

      return tx.stockMovement.create({
        data: {
          type: "entrada",
          quantity: input.quantity,
          balanceAfter: batch.quantity,
          reason: input.reason,
          medicationId,
          batchId: batch.id,
          userId,
        },
      });
    });
  },

  /**
   * Saída: de um lote específico ou, por padrão, dos lotes que vencem primeiro (FEFO),
   * podendo dividir a quantidade entre lotes. Lotes vencidos nunca são usados.
   */
  async exit(
    medicationId: string,
    input: ExitInput,
    userId: string,
    /** Atendimento em que o medicamento foi usado (Etapa 5) */
    context: { attendanceId?: string } = {},
  ) {
    return prisma.$transaction(async (tx) => {
      const medication = await findMedicationOrFail(medicationId, tx);

      if (medication.controlled && !input.reason && !input.patientId) {
        throw new AppError(
          "Medicamento controlado: informe o paciente ou a justificativa da saída.",
          400,
          "CONTROLLED_REQUIRES_REASON",
        );
      }
      if (input.patientId) {
        const patient = await tx.patient.findUnique({ where: { id: input.patientId } });
        if (!patient) throw new AppError("Paciente não encontrado", 400, "PATIENT_NOT_FOUND");
      }

      const today = todayUtc();
      const batches = await tx.stockBatch.findMany({
        where: {
          medicationId,
          quantity: { gt: 0 },
          expiresAt: { gte: today },
          ...(input.batchId ? { id: input.batchId } : {}),
        },
        orderBy: [{ expiresAt: "asc" }, { createdAt: "asc" }],
      });

      const available = roundQuantity(batches.reduce((sum, b) => sum + b.quantity, 0));
      if (input.batchId && batches.length === 0) {
        throw new AppError("Lote sem saldo, vencido ou de outro medicamento.", 400, "BATCH_UNAVAILABLE");
      }
      if (available < input.quantity) {
        throw new AppError(
          `Saldo insuficiente${input.batchId ? " no lote" : ""}: disponível ${formatQty(available)}.`,
          409,
          "INSUFFICIENT_STOCK",
        );
      }

      const movements = [];
      let remaining = input.quantity;
      for (const batch of batches) {
        if (remaining <= 0) break;
        const take = roundQuantity(Math.min(batch.quantity, remaining));
        const balanceAfter = roundQuantity(batch.quantity - take);
        await tx.stockBatch.update({ where: { id: batch.id }, data: { quantity: balanceAfter } });
        movements.push(
          await tx.stockMovement.create({
            data: {
              type: "saida",
              quantity: -take,
              balanceAfter,
              reason: input.reason,
              medicationId,
              batchId: batch.id,
              patientId: input.patientId ?? null,
              attendanceId: context.attendanceId ?? null,
              userId,
            },
            include: { batch: { select: { batchNumber: true } } },
          }),
        );
        remaining = roundQuantity(remaining - take);
      }
      return movements;
    });
  },

  /** Desfaz uma saída lançada por engano: devolve a quantidade ao mesmo lote. */
  async reverse(movementId: string, userId: string, reason: string) {
    return prisma.$transaction(async (tx) => {
      const movement = await tx.stockMovement.findUnique({
        where: { id: movementId },
        include: { reversedBy: { select: { id: true } }, batch: true },
      });
      if (!movement) throw new AppError("Movimentação não encontrada", 404);
      if (movement.type !== "saida") {
        throw new AppError("Só saídas podem ser estornadas.", 400, "NOT_REVERSIBLE");
      }
      if (movement.reversedBy) {
        throw new AppError("Esta saída já foi estornada.", 409, "ALREADY_REVERSED");
      }

      const returned = -movement.quantity;
      const balanceAfter = roundQuantity(movement.batch.quantity + returned);
      await tx.stockBatch.update({ where: { id: movement.batchId }, data: { quantity: balanceAfter } });
      return tx.stockMovement.create({
        data: {
          type: "estorno",
          quantity: returned,
          balanceAfter,
          reason,
          medicationId: movement.medicationId,
          batchId: movement.batchId,
          patientId: movement.patientId,
          attendanceId: movement.attendanceId,
          reversalOfId: movement.id,
          userId,
        },
      });
    });
  },

  /** Ajuste de inventário (define o saldo contado) ou perda/descarte de um lote. */
  async adjust(batchId: string, input: AdjustInput, userId: string) {
    return prisma.$transaction(async (tx) => {
      const batch = await tx.stockBatch.findUnique({ where: { id: batchId } });
      if (!batch) throw new AppError("Lote não encontrado", 404);

      let delta: number;
      if (input.type === "ajuste") {
        delta = roundQuantity(input.quantity - batch.quantity);
        if (delta === 0) {
          throw new AppError("O saldo informado é igual ao atual.", 400, "NO_CHANGE");
        }
      } else {
        if (input.quantity > batch.quantity) {
          throw new AppError(
            `A perda não pode ser maior que o saldo do lote (${formatQty(batch.quantity)}).`,
            409,
            "INSUFFICIENT_STOCK",
          );
        }
        delta = -input.quantity;
      }

      const balanceAfter = roundQuantity(batch.quantity + delta);
      await tx.stockBatch.update({ where: { id: batchId }, data: { quantity: balanceAfter } });
      return tx.stockMovement.create({
        data: {
          type: input.type,
          quantity: delta,
          balanceAfter,
          reason: input.reason,
          medicationId: batch.medicationId,
          batchId,
          userId,
        },
      });
    });
  },

  // ---------- Alertas ----------

  /** Itens que precisam de atenção: abaixo do mínimo, vencendo e vencidos com saldo. */
  async alerts() {
    const today = todayUtc();
    const medications = await prisma.medication.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: { batches: { where: { quantity: { gt: 0 } }, orderBy: { expiresAt: "asc" } } },
    });

    const lowStock = [];
    const expiring = [];
    const expired = [];

    for (const medication of medications) {
      const stock = summarizeStock(medication);
      const info = { id: medication.id, name: medication.name, unit: medication.unit };
      if (stock.belowMinimum) lowStock.push({ ...info, available: stock.available, minStock: medication.minStock });

      for (const batch of medication.batches) {
        const entry = {
          medication: info,
          batchId: batch.id,
          batchNumber: batch.batchNumber,
          expiresAt: batch.expiresAt,
          quantity: batch.quantity,
        };
        if (isExpired(batch.expiresAt, today)) expired.push(entry);
        else if (isExpiringSoon(batch.expiresAt, today)) expiring.push(entry);
      }
    }

    const byExpiry = (a: { expiresAt: Date }, b: { expiresAt: Date }) =>
      a.expiresAt.getTime() - b.expiresAt.getTime();
    return { lowStock, expiring: expiring.sort(byExpiry), expired: expired.sort(byExpiry) };
  },
};
