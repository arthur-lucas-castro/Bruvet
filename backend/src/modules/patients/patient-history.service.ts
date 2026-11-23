import { z } from "zod";
import { AppError } from "../../lib/app-error.js";
import { prisma } from "../../lib/prisma.js";
import { normalizeSearch } from "../../lib/search.js";

export const HISTORY_TYPES = ["todos", "atendimentos", "medicamentos", "pesos"] as const;

export const historyEventsSchema = z.object({
  type: z.enum(HISTORY_TYPES, "Tipo de evento inválido").default("todos"),
  // Instantes ISO calculados pelo navegador no fuso local: "from" incluso, "until" excluso
  // (ex.: o período 01/11 a 30/11 vai como from=01/11 00:00 e until=01/12 00:00, hora local)
  from: z.coerce.date("Data inicial inválida").optional(),
  until: z.coerce.date("Data final inválida").optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

type HistoryQuery = z.infer<typeof historyEventsSchema>;

async function assertPatient(id: string) {
  const patient = await prisma.patient.findUnique({
    where: { id },
    select: { id: true, createdAt: true, deceasedAt: true },
  });
  if (!patient) throw new AppError("Paciente não encontrado", 404);
  return patient;
}

/** Saídas de estoque válidas (não estornadas) para o paciente. */
const activeExitsWhere = (patientId: string) => ({
  patientId,
  type: "saida",
  reversedBy: null,
});

const medicationSelect = { select: { id: true, name: true, unit: true, controlled: true } } as const;

export const patientHistoryService = {
  /**
   * Linha do tempo do paciente, do mais recente para o mais antigo. Cada atendimento traz
   * seus procedimentos, medicamentos e anotações; medicamentos dados fora de atendimento e
   * pesagens do cadastro aparecem como eventos próprios.
   */
  async events(patientId: string, { type, from, until, page, pageSize }: HistoryQuery) {
    const patient = await assertPatient(patientId);
    const range = from || until ? { gte: from, lt: until } : undefined;
    const want = (t: (typeof HISTORY_TYPES)[number]) => type === "todos" || type === t;

    const [attendances, medications, weights] = await Promise.all([
      want("atendimentos")
        ? prisma.attendance.findMany({
            where: { patientId, startedAt: range },
            include: {
              veterinarian: { select: { id: true, name: true, crmv: true } },
              procedures: {
                orderBy: { createdAt: "asc" },
                select: { id: true, name: true, quantity: true, priceCents: true, species: true, size: true },
              },
              stockMovements: {
                where: { type: "saida", reversedBy: null },
                orderBy: { createdAt: "asc" },
                select: { id: true, quantity: true, medication: medicationSelect },
              },
              notes: {
                orderBy: { createdAt: "asc" },
                select: { id: true, text: true, createdAt: true, author: { select: { name: true } } },
              },
            },
          })
        : [],
      want("medicamentos")
        ? prisma.stockMovement.findMany({
            // No filtro "todos", os medicamentos de atendimento já vêm dentro do atendimento
            where: {
              ...activeExitsWhere(patientId),
              attendanceId: type === "todos" ? null : undefined,
              createdAt: range,
            },
            include: {
              medication: medicationSelect,
              batch: { select: { batchNumber: true } },
              user: { select: { name: true } },
              attendance: { select: { id: true, code: true } },
            },
          })
        : [],
      want("pesos")
        ? prisma.patientWeight.findMany({
            // No filtro "todos", o peso do atendimento já aparece no próprio atendimento
            where: { patientId, source: type === "todos" ? "cadastro" : undefined, recordedAt: range },
            include: { recordedBy: { select: { name: true } } },
          })
        : [],
    ]);

    const inRange = (date: Date) => (!from || date >= from) && (!until || date < until);

    const events = [
      ...attendances.map((attendance) => ({
        type: "atendimento" as const,
        at: attendance.startedAt,
        attendance: {
          ...attendance,
          totalCents: attendance.procedures.reduce((sum, p) => sum + p.priceCents * p.quantity, 0),
        },
      })),
      ...medications.map((movement) => ({ type: "medicamento" as const, at: movement.createdAt, movement })),
      ...weights.map((weight) => ({ type: "peso" as const, at: weight.recordedAt, weight })),
      ...(type === "todos" && inRange(patient.createdAt)
        ? [{ type: "cadastro" as const, at: patient.createdAt }]
        : []),
      ...(type === "todos" && patient.deceasedAt && inRange(patient.deceasedAt)
        ? [{ type: "obito" as const, at: patient.deceasedAt }]
        : []),
    ].sort((a, b) => b.at.getTime() - a.at.getTime());

    const start = (page - 1) * pageSize;
    return { items: events.slice(start, start + pageSize), total: events.length, page, pageSize };
  },

  /** Resumo clínico: curva de peso, vacinas aplicadas e medicamentos já administrados. */
  async summary(patientId: string) {
    await assertPatient(patientId);

    const [weights, attendanceStats, lastAttendance, vaccineItems, exits] = await Promise.all([
      prisma.patientWeight.findMany({
        where: { patientId },
        orderBy: { recordedAt: "asc" },
        select: { id: true, weightKg: true, recordedAt: true, source: true, attendanceId: true },
      }),
      prisma.attendance.groupBy({ by: ["status"], where: { patientId }, _count: { _all: true } }),
      prisma.attendance.findFirst({
        where: { patientId, status: { not: "cancelado" } },
        orderBy: { startedAt: "desc" },
        select: { id: true, kind: true, startedAt: true, diagnosis: true },
      }),
      prisma.attendanceProcedure.findMany({
        where: { attendance: { patientId, status: { not: "cancelado" } } },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          createdAt: true,
          attendanceId: true,
          procedure: { select: { category: { select: { name: true } } } },
        },
      }),
      prisma.stockMovement.findMany({
        where: activeExitsWhere(patientId),
        orderBy: { createdAt: "desc" },
        select: { quantity: true, createdAt: true, medication: medicationSelect },
      }),
    ]);

    // Vacinas: procedimentos de categorias cujo nome contém "vacina"
    const vaccines = vaccineItems
      .filter((item) => normalizeSearch(item.procedure.category.name).includes("vacin"))
      .map(({ procedure: _procedure, ...item }) => item);

    // Medicamentos administrados, agrupados (a lista já vem do mais recente)
    const byMedication = new Map<
      string,
      { medication: (typeof exits)[number]["medication"]; times: number; totalQuantity: number; lastAt: Date }
    >();
    for (const exit of exits) {
      const entry = byMedication.get(exit.medication.id);
      if (entry) {
        entry.times++;
        entry.totalQuantity += -exit.quantity;
      } else {
        byMedication.set(exit.medication.id, {
          medication: exit.medication,
          times: 1,
          totalQuantity: -exit.quantity,
          lastAt: exit.createdAt,
        });
      }
    }

    const count = (status: string) => attendanceStats.find((s) => s.status === status)?._count._all ?? 0;

    return {
      weights,
      vaccines,
      medications: [...byMedication.values()].map((m) => ({
        ...m,
        totalQuantity: Math.round(m.totalQuantity * 1000) / 1000,
      })),
      attendances: {
        finished: count("finalizado"),
        open: count("aberto"),
        cancelled: count("cancelado"),
        last: lastAttendance,
      },
    };
  },
};
