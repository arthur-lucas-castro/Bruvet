import { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../../lib/app-error.js";
import { toSkipTake } from "../../lib/pagination.js";
import { prisma } from "../../lib/prisma.js";
import { buildSearchText, searchTerms } from "../../lib/search.js";
import type { ListPatientsQuery, PatientInput } from "./patients.schemas.js";

const patientSearchText = (input: PatientInput) =>
  buildSearchText(input.name, input.breed, input.microchip);

const tutorSummary = { select: { id: true, name: true, phone: true } } as const;

async function assertTutorExists(tutorId: string) {
  const tutor = await prisma.tutor.findUnique({ where: { id: tutorId }, select: { id: true } });
  if (!tutor) throw new AppError("Tutor não encontrado", 400, "TUTOR_NOT_FOUND");
}

async function assertMicrochipAvailable(microchip: string | null, exceptId?: string) {
  if (!microchip) return;
  const existing = await prisma.patient.findUnique({ where: { microchip }, select: { id: true } });
  if (existing && existing.id !== exceptId) {
    throw new AppError("Já existe um paciente com este microchip", 409, "DUPLICATE_MICROCHIP");
  }
}

const isCodeConflict = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2002" &&
  JSON.stringify(error.meta ?? {}).includes("code");

export const patientsService = {
  async list({ q, species, status, ...pagination }: ListPatientsQuery) {
    const terms = searchTerms(q);
    const where: Prisma.PatientWhereInput = {
      species,
      deceasedAt: status === "ativos" ? null : status === "obitos" ? { not: null } : undefined,
      AND: terms.map((term) => {
        const code = /^\d+$/.test(term) ? Number(term) : undefined;
        return {
          OR: [
            { searchText: { contains: term } },
            // Também encontra pelo nome/CPF/telefone do tutor e pelo número do prontuário
            { tutor: { searchText: { contains: term } } },
            ...(code !== undefined ? [{ code }] : []),
          ],
        };
      }),
    };

    const [items, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        orderBy: { name: "asc" },
        ...toSkipTake(pagination),
        include: { tutor: tutorSummary },
      }),
      prisma.patient.count({ where }),
    ]);

    return { items, total, ...pagination };
  },

  async get(id: string) {
    const patient = await prisma.patient.findUnique({ where: { id }, include: { tutor: true } });
    if (!patient) throw new AppError("Paciente não encontrado", 404);
    return patient;
  },

  async create(input: PatientInput, actorId: string) {
    await assertTutorExists(input.tutorId);
    await assertMicrochipAvailable(input.microchip);

    // O número do prontuário é o próximo da sequência. Se dois cadastros simultâneos
    // pegarem o mesmo número, o índice único recusa um deles e tentamos de novo.
    for (let attempt = 0; ; attempt++) {
      try {
        const last = await prisma.patient.aggregate({ _max: { code: true } });
        return await prisma.patient.create({
          data: {
            ...input,
            code: (last._max.code ?? 0) + 1,
            searchText: patientSearchText(input),
            // O peso informado no cadastro inicia a curva de peso do histórico
            weights: input.weightKg
              ? { create: { weightKg: input.weightKg, source: "cadastro", recordedById: actorId } }
              : undefined,
          },
          include: { tutor: tutorSummary },
        });
      } catch (error) {
        if (attempt < 3 && isCodeConflict(error)) continue;
        throw error;
      }
    }
  },

  async update(id: string, input: PatientInput, actorId: string) {
    const current = await this.get(id);
    await assertTutorExists(input.tutorId);
    await assertMicrochipAvailable(input.microchip, id);
    // Peso alterado na edição do cadastro também entra no histórico de pesagens
    const weightChanged = input.weightKg != null && input.weightKg !== current.weightKg;
    return prisma.patient.update({
      where: { id },
      data: {
        ...input,
        searchText: patientSearchText(input),
        weights: weightChanged
          ? { create: { weightKg: input.weightKg!, source: "cadastro", recordedById: actorId } }
          : undefined,
      },
      include: { tutor: tutorSummary },
    });
  },
};
