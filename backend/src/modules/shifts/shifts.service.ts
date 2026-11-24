import type { z } from "zod";
import type { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../../lib/app-error.js";
import { prisma } from "../../lib/prisma.js";
import type { PublicUser } from "../users/users.presenter.js";
import { SHIFT_KINDS, SHIFT_ROLES, shiftState, type ShiftKind } from "./shift-kinds.js";
import type {
  createShiftsSchema,
  listShiftsSchema,
  payShiftsSchema,
  periodSchema,
  ratesSchema,
  unpayShiftsSchema,
  updateShiftSchema,
} from "./shifts.schemas.js";

type Tx = Prisma.TransactionClient;
type CreateInput = z.infer<typeof createShiftsSchema>;
type UpdateInput = z.infer<typeof updateShiftSchema>;

const isAdmin = (viewer: PublicUser) => viewer.role === "admin";

/** Profissionais que podem ser escalados: veterinários, enfermagem e admins com CRMV. */
const staffWhere: Prisma.UserWhereInput = {
  OR: [{ role: { in: [...SHIFT_ROLES] } }, { role: "admin", crmv: { not: null } }],
};

const shiftSelect = {
  id: true,
  kind: true,
  startsAt: true,
  endsAt: true,
  amountCents: true,
  status: true,
  notes: true,
  paidAt: true,
  paymentNotes: true,
  createdAt: true,
  user: { select: { id: true, name: true, role: true, crmv: true } },
  paidBy: { select: { id: true, name: true } },
} satisfies Prisma.ShiftSelect;

type ShiftRow = Prisma.ShiftGetPayload<{ select: typeof shiftSelect }>;

/**
 * Valores só aparecem para o admin e para o próprio profissional; os demais veem só os horários.
 */
function present(shift: ShiftRow, viewer: PublicUser, now = new Date()) {
  const canSeeValue = isAdmin(viewer) || shift.user.id === viewer.id;
  return {
    ...shift,
    state: shiftState(shift, now),
    amountCents: canSeeValue ? shift.amountCents : null,
    paidAt: canSeeValue ? shift.paidAt : null,
    paymentNotes: isAdmin(viewer) ? shift.paymentNotes : null,
    paidBy: isAdmin(viewer) ? shift.paidBy : null,
  };
}

async function assertStaff(tx: Tx, userId: string) {
  const user = await tx.user.findFirst({ where: { id: userId, active: true, ...staffWhere }, select: { id: true } });
  if (!user) throw new AppError("Profissional não encontrado ou não pode ser escalado.", 422, "NOT_STAFF");
}

/** Um profissional não pode estar em dois plantões ao mesmo tempo (faltas não contam). */
async function assertNoOverlap(tx: Tx, userId: string, slots: { startsAt: Date; endsAt: Date }[], ignoreId?: string) {
  const sorted = [...slots].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].startsAt < sorted[i - 1].endsAt) {
      throw new AppError("Os plantões informados se sobrepõem.", 409, "SHIFT_OVERLAP");
    }
  }
  const clash = await tx.shift.findFirst({
    where: {
      userId,
      status: "escalado",
      id: ignoreId ? { not: ignoreId } : undefined,
      OR: slots.map((s) => ({ startsAt: { lt: s.endsAt }, endsAt: { gt: s.startsAt } })),
    },
    select: { startsAt: true },
  });
  if (clash) {
    const when = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      dateStyle: "short",
      timeStyle: "short",
    }).format(clash.startsAt);
    throw new AppError(`O profissional já tem um plantão nesse horário (${when}).`, 409, "SHIFT_OVERLAP");
  }
}

async function findShift(tx: Tx, id: string) {
  const shift = await tx.shift.findUnique({ where: { id } });
  if (!shift) throw new AppError("Plantão não encontrado.", 404, "NOT_FOUND");
  return shift;
}

async function ratesOf(userIds: string[]) {
  const rows = await prisma.shiftRate.findMany({ where: { userId: { in: userIds } } });
  const map = new Map<string, Record<ShiftKind, number | null>>();
  for (const id of userIds) map.set(id, { diurno: null, noturno: null, "24h": null });
  for (const r of rows) map.get(r.userId)![r.kind as ShiftKind] = r.amountCents;
  return map;
}

export const shiftsService = {
  /** Profissionais escaláveis; o admin recebe também os valores padrão. */
  async staff(viewer: PublicUser) {
    const users = await prisma.user.findMany({
      where: { active: true, ...staffWhere },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true, crmv: true },
    });
    if (!isAdmin(viewer)) return users.map((u) => ({ ...u, rates: null }));
    const rates = await ratesOf(users.map((u) => u.id));
    return users.map((u) => ({ ...u, rates: rates.get(u.id)! }));
  },

  async setRates(userId: string, input: z.infer<typeof ratesSchema>) {
    await prisma.$transaction(async (tx) => {
      await assertStaff(tx, userId);
      for (const kind of SHIFT_KINDS) {
        const amountCents = input[kind];
        if (amountCents === null) {
          await tx.shiftRate.deleteMany({ where: { userId, kind } });
        } else {
          await tx.shiftRate.upsert({
            where: { userId_kind: { userId, kind } },
            create: { userId, kind, amountCents },
            update: { amountCents },
          });
        }
      }
    });
    return (await ratesOf([userId])).get(userId)!;
  },

  /** Plantões que tocam o período (começam antes do fim e terminam depois do início). */
  async list({ from, until, userId }: z.infer<typeof listShiftsSchema>, viewer: PublicUser) {
    const shifts = await prisma.shift.findMany({
      where: { startsAt: { lt: until }, endsAt: { gt: from }, userId },
      orderBy: [{ startsAt: "asc" }, { user: { name: "asc" } }],
      select: shiftSelect,
    });
    const now = new Date();
    return shifts.map((s) => present(s, viewer, now));
  },

  async create(input: CreateInput, actor: PublicUser) {
    const created = await prisma.$transaction(async (tx) => {
      await assertStaff(tx, input.userId);
      let amountCents = input.amountCents ?? null;
      if (amountCents === null) {
        const rate = await tx.shiftRate.findUnique({ where: { userId_kind: { userId: input.userId, kind: input.kind } } });
        if (!rate) {
          throw new AppError(
            "Este profissional não tem valor cadastrado para este tipo de plantão. Informe o valor.",
            422,
            "NO_RATE",
          );
        }
        amountCents = rate.amountCents;
      }
      await assertNoOverlap(tx, input.userId, input.slots);
      const ids: string[] = [];
      for (const slot of input.slots) {
        const shift = await tx.shift.create({
          data: {
            userId: input.userId,
            kind: input.kind,
            startsAt: slot.startsAt,
            endsAt: slot.endsAt,
            amountCents,
            notes: input.notes,
            createdById: actor.id,
          },
          select: { id: true },
        });
        ids.push(shift.id);
      }
      return ids;
    });
    const rows = await prisma.shift.findMany({ where: { id: { in: created } }, orderBy: { startsAt: "asc" }, select: shiftSelect });
    return rows.map((s) => present(s, actor));
  },

  async update(id: string, input: UpdateInput, actor: PublicUser) {
    await prisma.$transaction(async (tx) => {
      const shift = await findShift(tx, id);
      const changesMoney = Object.keys(input).some((k) => k !== "notes");
      if (shift.paidAt && changesMoney) {
        throw new AppError("Plantão já pago: desfaça o pagamento antes de alterar.", 409, "SHIFT_PAID");
      }
      const next = {
        userId: input.userId ?? shift.userId,
        startsAt: input.startsAt ?? shift.startsAt,
        endsAt: input.endsAt ?? shift.endsAt,
        status: input.status ?? shift.status,
      };
      if (next.endsAt <= next.startsAt) throw new AppError("O fim precisa ser depois do início.", 422, "INVALID_RANGE");
      if (next.endsAt.getTime() - next.startsAt.getTime() > 36 * 3_600_000) {
        throw new AppError("Um plantão pode ter no máximo 36 horas.", 422, "INVALID_RANGE");
      }
      if (input.userId && input.userId !== shift.userId) await assertStaff(tx, input.userId);
      if (next.status === "escalado") await assertNoOverlap(tx, next.userId, [next], id);
      await tx.shift.update({ where: { id }, data: input });
    });
    const row = await prisma.shift.findUniqueOrThrow({ where: { id }, select: shiftSelect });
    return present(row, actor);
  },

  async remove(id: string) {
    await prisma.$transaction(async (tx) => {
      const shift = await findShift(tx, id);
      if (shift.paidAt) throw new AppError("Plantão já pago não pode ser excluído.", 409, "SHIFT_PAID");
      await tx.shift.delete({ where: { id } });
    });
  },

  /** Marca plantões realizados como pagos ao profissional (todos ou nenhum). */
  async pay({ shiftIds, notes }: z.infer<typeof payShiftsSchema>, actor: PublicUser) {
    const ids = [...new Set(shiftIds)];
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      const shifts = await tx.shift.findMany({ where: { id: { in: ids } } });
      if (shifts.length !== ids.length) throw new AppError("Plantão não encontrado.", 404, "NOT_FOUND");
      for (const s of shifts) {
        if (s.paidAt) throw new AppError("Um dos plantões já está pago.", 409, "SHIFT_PAID");
        if (shiftState(s, now) !== "realizado") {
          throw new AppError("Só plantões realizados (terminados e sem falta) podem ser pagos.", 409, "SHIFT_NOT_DONE");
        }
      }
      // Condição paidAt null protege contra dois pagamentos simultâneos
      const { count } = await tx.shift.updateMany({
        where: { id: { in: ids }, paidAt: null },
        data: { paidAt: now, paidById: actor.id, paymentNotes: notes },
      });
      if (count !== ids.length) throw new AppError("Um dos plantões já está pago.", 409, "SHIFT_PAID");
    });
    return { paid: ids.length };
  },

  async unpay({ shiftIds }: z.infer<typeof unpayShiftsSchema>) {
    const { count } = await prisma.shift.updateMany({
      where: { id: { in: shiftIds }, paidAt: { not: null } },
      data: { paidAt: null, paidById: null, paymentNotes: null },
    });
    return { unpaid: count };
  },

  /**
   * Totais por profissional dos plantões que COMEÇAM no período. Para quem não é admin,
   * só a própria linha.
   */
  async summary({ from, until }: z.infer<typeof periodSchema>, viewer: PublicUser) {
    const shifts = await prisma.shift.findMany({
      where: { startsAt: { gte: from, lt: until }, userId: isAdmin(viewer) ? undefined : viewer.id },
      orderBy: { startsAt: "asc" },
      select: { id: true, kind: true, status: true, startsAt: true, endsAt: true, amountCents: true, paidAt: true, user: { select: { id: true, name: true, role: true } } },
    });
    const now = new Date();
    type Row = {
      user: { id: string; name: string; role: string };
      shifts: number;
      done: number;
      absences: number;
      hours: number;
      doneCents: number;
      paidCents: number;
      pendingCents: number;
      scheduledCents: number;
      pendingShiftIds: string[];
    };
    const rows = new Map<string, Row>();
    for (const s of shifts) {
      const row =
        rows.get(s.user.id) ??
        ({ user: s.user, shifts: 0, done: 0, absences: 0, hours: 0, doneCents: 0, paidCents: 0, pendingCents: 0, scheduledCents: 0, pendingShiftIds: [] } satisfies Row);
      rows.set(s.user.id, row);
      row.shifts++;
      const state = shiftState(s, now);
      if (state === "falta") row.absences++;
      else if (state === "realizado") {
        row.done++;
        row.hours += (s.endsAt.getTime() - s.startsAt.getTime()) / 3_600_000;
        row.doneCents += s.amountCents;
        if (s.paidAt) row.paidCents += s.amountCents;
        else {
          row.pendingCents += s.amountCents;
          row.pendingShiftIds.push(s.id);
        }
      } else row.scheduledCents += s.amountCents;
    }
    const list = [...rows.values()].sort((a, b) => a.user.name.localeCompare(b.user.name, "pt-BR"));
    const sum = (key: "doneCents" | "paidCents" | "pendingCents" | "scheduledCents") => list.reduce((t, r) => t + r[key], 0);
    return {
      rows: list,
      totals: {
        doneCents: sum("doneCents"),
        paidCents: sum("paidCents"),
        pendingCents: sum("pendingCents"),
        scheduledCents: sum("scheduledCents"),
      },
    };
  },
};
