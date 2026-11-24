import { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../../lib/app-error.js";
import { toSkipTake } from "../../lib/pagination.js";
import { prisma } from "../../lib/prisma.js";
import { searchTerms } from "../../lib/search.js";
import { resolvePrice } from "../procedures/pricing.js";
import { stockService } from "../stock/stock.service.js";
import { billingService } from "../billing/billing.service.js";
import type { z } from "zod";
import type {
  addMedicationSchema,
  addProcedureSchema,
  ClinicalInput,
  createAttendanceSchema,
  ListAttendancesQuery,
} from "./attendances.schemas.js";

type CreateInput = z.infer<typeof createAttendanceSchema>;
type AddProcedureInput = z.infer<typeof addProcedureSchema>;
type AddMedicationInput = z.infer<typeof addMedicationSchema>;

const formatCode = (code: number) => String(code).padStart(6, "0");

const isCodeConflict = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2002" &&
  JSON.stringify(error.meta ?? {}).includes("code");

/** Pode ser responsável por um atendimento: veterinário ativo, ou admin com CRMV. */
async function assertVeterinarian(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const isVet = user?.active && (user.role === "veterinario" || (user.role === "admin" && user.crmv));
  if (!isVet) {
    throw new AppError("Selecione um veterinário ativo com CRMV.", 400, "INVALID_VETERINARIAN");
  }
}

async function findOrFail(id: string) {
  const attendance = await prisma.attendance.findUnique({ where: { id } });
  if (!attendance) throw new AppError("Atendimento não encontrado", 404);
  return attendance;
}

async function findOpenOrFail(id: string) {
  const attendance = await findOrFail(id);
  if (attendance.status !== "aberto") {
    throw new AppError(
      attendance.status === "finalizado"
        ? "Atendimento finalizado: a ficha não pode mais ser alterada. Use uma anotação de adendo."
        : "Atendimento cancelado.",
      409,
      "ATTENDANCE_LOCKED",
    );
  }
  return attendance;
}

const listInclude = {
  patient: {
    select: { id: true, name: true, code: true, species: true, tutor: { select: { id: true, name: true } } },
  },
  veterinarian: { select: { id: true, name: true } },
  _count: { select: { procedures: true } },
} as const;

export const attendancesService = {
  /** Veterinários que podem ser responsáveis por atendimentos. */
  veterinarians() {
    return prisma.user.findMany({
      where: {
        active: true,
        OR: [{ role: "veterinario" }, { role: "admin", crmv: { not: null } }],
      },
      select: { id: true, name: true, crmv: true },
      orderBy: { name: "asc" },
    });
  },

  async list({ q, status, veterinarianId, patientId, ...pagination }: ListAttendancesQuery) {
    const where: Prisma.AttendanceWhereInput = {
      status: status === "todos" ? undefined : status,
      veterinarianId: veterinarianId || undefined,
      patientId: patientId || undefined,
      AND: searchTerms(q).map((term) => {
        const code = /^\d+$/.test(term) ? Number(term) : undefined;
        return {
          OR: [
            { patient: { searchText: { contains: term } } },
            { patient: { tutor: { searchText: { contains: term } } } },
            ...(code !== undefined ? [{ code }, { patient: { code } }] : []),
          ],
        };
      }),
    };

    const [items, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        orderBy: { startedAt: "desc" },
        ...toSkipTake(pagination),
        include: listInclude,
      }),
      prisma.attendance.count({ where }),
    ]);
    return { items, total, ...pagination };
  },

  async get(id: string) {
    const attendance = await prisma.attendance.findUnique({
      where: { id },
      include: {
        patient: { include: { tutor: { select: { id: true, name: true, phone: true } } } },
        veterinarian: { select: { id: true, name: true, crmv: true } },
        createdBy: { select: { id: true, name: true } },
        notes: {
          orderBy: { createdAt: "asc" },
          include: { author: { select: { id: true, name: true, role: true } } },
        },
        procedures: {
          orderBy: { createdAt: "asc" },
          include: { addedBy: { select: { id: true, name: true } } },
        },
        stockMovements: {
          orderBy: { createdAt: "asc" },
          include: {
            medication: { select: { id: true, name: true, unit: true, controlled: true } },
            batch: { select: { id: true, batchNumber: true } },
            user: { select: { id: true, name: true } },
            reversedBy: { select: { id: true, createdAt: true } },
          },
        },
        bill: { select: { id: true, status: true } },
      },
    });
    if (!attendance) throw new AppError("Atendimento não encontrado", 404);

    const totalCents = attendance.procedures.reduce((sum, p) => sum + p.priceCents * p.quantity, 0);
    return { ...attendance, totalCents };
  },

  async create(input: CreateInput, actorId: string) {
    const patient = await prisma.patient.findUnique({ where: { id: input.patientId } });
    if (!patient) throw new AppError("Paciente não encontrado", 400, "PATIENT_NOT_FOUND");
    if (patient.deceasedAt) {
      throw new AppError("Este paciente tem óbito registrado.", 400, "PATIENT_DECEASED");
    }
    await assertVeterinarian(input.veterinarianId);

    // Número sequencial; em cadastros simultâneos o índice único recusa a repetição e tentamos de novo
    for (let attempt = 0; ; attempt++) {
      try {
        const last = await prisma.attendance.aggregate({ _max: { code: true } });
        return await prisma.attendance.create({
          data: {
            ...input,
            code: (last._max.code ?? 0) + 1,
            createdById: actorId,
            // Cada atendimento tem a sua comanda (o que será cobrado do tutor)
            bill: { create: {} },
          },
        });
      } catch (error) {
        if (attempt < 3 && isCodeConflict(error)) continue;
        throw error;
      }
    }
  },

  async updateClinical(id: string, input: ClinicalInput) {
    const current = await findOpenOrFail(id);
    if (input.veterinarianId !== current.veterinarianId) await assertVeterinarian(input.veterinarianId);
    return prisma.attendance.update({ where: { id }, data: input });
  },

  /** Finaliza: trava a ficha e atualiza o peso atual do paciente com o do exame. */
  async finish(id: string) {
    const attendance = await findOpenOrFail(id);
    if (!attendance.chiefComplaint) {
      throw new AppError(
        "Preencha e salve a queixa principal antes de finalizar.",
        400,
        "MISSING_CHIEF_COMPLAINT",
      );
    }

    const finishedAt = new Date();
    const weightKg = attendance.weightKg;
    return withBillSync(id, () => prisma.$transaction(async (tx) => {
      const updated = await tx.attendance.update({
        where: { id },
        data: { status: "finalizado", finishedAt },
      });
      if (weightKg) {
        await tx.patient.update({ where: { id: attendance.patientId }, data: { weightKg } });
        // Registra a pesagem no histórico (substitui a anterior se o atendimento foi reaberto)
        await tx.patientWeight.upsert({
          where: { attendanceId: id },
          create: {
            patientId: attendance.patientId,
            weightKg,
            source: "atendimento",
            attendanceId: id,
            recordedById: attendance.veterinarianId,
            recordedAt: finishedAt,
          },
          update: { weightKg, recordedAt: finishedAt },
        });
      } else {
        // Reaberto e finalizado sem peso: remove a pesagem anterior deste atendimento
        await tx.patientWeight.deleteMany({ where: { attendanceId: id } });
      }
      return updated;
    }));
  },

  async cancel(id: string, reason: string) {
    await findOpenOrFail(id);
    const [procedures, activeMedications, billItems, payments] = await Promise.all([
      prisma.attendanceProcedure.count({ where: { attendanceId: id } }),
      prisma.stockMovement.count({ where: { attendanceId: id, type: "saida", reversedBy: null } }),
      prisma.billItem.count({ where: { bill: { attendanceId: id } } }),
      prisma.payment.count({ where: { bill: { attendanceId: id }, voidedAt: null } }),
    ]);
    if (procedures > 0 || activeMedications > 0) {
      throw new AppError(
        "Remova os procedimentos e estorne os medicamentos antes de cancelar.",
        409,
        "ATTENDANCE_HAS_ITEMS",
      );
    }
    if (billItems > 0 || payments > 0) {
      throw new AppError(
        "A comanda deste atendimento tem itens ou pagamentos. Remova os itens e peça a um administrador para estornar os pagamentos antes de cancelar.",
        409,
        "BILL_HAS_ITEMS",
      );
    }
    return withBillSync(id, () =>
      prisma.attendance.update({
        where: { id },
        data: { status: "cancelado", cancelReason: reason, finishedAt: new Date() },
      }),
    );
  },

  async reopen(id: string) {
    const attendance = await findOrFail(id);
    if (attendance.status !== "finalizado") {
      throw new AppError("Só atendimentos finalizados podem ser reabertos.", 409, "NOT_FINISHED");
    }
    return withBillSync(id, () =>
      prisma.attendance.update({ where: { id }, data: { status: "aberto", finishedAt: null } }),
    );
  },

  // ---------- Evolução ----------

  async addNote(id: string, text: string, authorId: string) {
    const attendance = await findOrFail(id);
    if (attendance.status === "cancelado") {
      throw new AppError("Atendimento cancelado.", 409, "ATTENDANCE_LOCKED");
    }
    return prisma.attendanceNote.create({
      data: { attendanceId: id, text, authorId },
      include: { author: { select: { id: true, name: true, role: true } } },
    });
  },

  // ---------- Procedimentos ----------

  /** Lança um procedimento com o preço vigente para a espécie/porte do paciente. */
  async addProcedure(id: string, input: AddProcedureInput, actorId: string) {
    const attendance = await findOpenOrFail(id);
    const [procedure, patient] = await Promise.all([
      prisma.procedure.findUnique({ where: { id: input.procedureId }, include: { prices: true } }),
      prisma.patient.findUniqueOrThrow({
        where: { id: attendance.patientId },
        select: { species: true, size: true },
      }),
    ]);
    if (!procedure) throw new AppError("Procedimento não encontrado", 400, "PROCEDURE_NOT_FOUND");
    if (!procedure.active) throw new AppError("Procedimento inativo no catálogo.", 400, "PROCEDURE_INACTIVE");

    const { priceCents, variant } = resolvePrice(procedure, patient);
    return withBillSync(id, () =>
      prisma.attendanceProcedure.create({
        data: {
          attendanceId: id,
          procedureId: procedure.id,
          name: procedure.name,
          priceCents,
          // Custo copiado no lançamento, para o financeiro não mudar com reajustes futuros
          costCents: procedure.costCents,
          quantity: input.quantity,
          species: variant?.species ?? null,
          size: variant?.size ?? null,
          notes: input.notes,
          addedById: actorId,
        },
      }),
    );
  },

  async removeProcedure(id: string, itemId: string) {
    await findOpenOrFail(id);
    const item = await prisma.attendanceProcedure.findUnique({ where: { id: itemId } });
    if (!item || item.attendanceId !== id) throw new AppError("Item não encontrado", 404);
    await assertKeepsPaidCovered(id, item.priceCents * item.quantity);
    await withBillSync(id, () => prisma.attendanceProcedure.delete({ where: { id: itemId } }));
  },

  // ---------- Medicamentos ----------

  /** Registra o uso de um medicamento: dá saída no estoque ligada ao paciente e ao atendimento. */
  async addMedication(id: string, input: AddMedicationInput, actorId: string) {
    const attendance = await findOpenOrFail(id);
    return withBillSync(id, () =>
      stockService.exit(
        input.medicationId,
        {
          quantity: input.quantity,
          batchId: input.batchId ?? null,
          patientId: attendance.patientId,
          reason: input.reason ?? `Atendimento nº ${formatCode(attendance.code)}`,
        },
        actorId,
        { attendanceId: id },
      ),
    );
  },

  async reverseMedication(id: string, movementId: string, actorId: string, reason?: string) {
    const attendance = await findOpenOrFail(id);
    const movement = await prisma.stockMovement.findUnique({ where: { id: movementId } });
    if (!movement || movement.attendanceId !== id) throw new AppError("Lançamento não encontrado", 404);
    if (movement.salePriceCents != null) {
      await assertKeepsPaidCovered(id, Math.round(-movement.quantity * movement.salePriceCents));
    }
    return withBillSync(id, () =>
      stockService.reverse(movementId, actorId, reason || `Estorno no atendimento nº ${formatCode(attendance.code)}`),
    );
  },
};

/** Executa uma alteração no atendimento e recalcula a situação da comanda dele. */
async function withBillSync<T>(attendanceId: string, action: () => Promise<T>): Promise<T> {
  const result = await action();
  await billingService.syncByAttendance(attendanceId);
  return result;
}

/** Impede que remover um item cobrado deixe a comanda com valor menor que o já pago. */
async function assertKeepsPaidCovered(attendanceId: string, removedCents: number) {
  const bill = await billingService.getByAttendance(attendanceId).catch(() => null);
  if (bill && bill.totals.subtotalCents - removedCents - bill.discountCents < bill.totals.paidCents) {
    throw new AppError(
      "A comanda já tem pagamentos e ficaria com valor menor que o pago. Peça a um administrador para estornar um pagamento antes.",
      409,
      "BELOW_PAID",
    );
  }
}
