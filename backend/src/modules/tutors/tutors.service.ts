import type { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../../lib/app-error.js";
import { toSkipTake } from "../../lib/pagination.js";
import { prisma } from "../../lib/prisma.js";
import { buildSearchText, searchTerms } from "../../lib/search.js";
import type { ListTutorsQuery, TutorInput } from "./tutors.schemas.js";

const tutorSearchText = (input: TutorInput) =>
  buildSearchText(input.name, input.cpf, input.phone, input.phoneAlt, input.email);

async function assertCpfAvailable(cpf: string | null, exceptId?: string) {
  if (!cpf) return;
  const existing = await prisma.tutor.findUnique({ where: { cpf }, select: { id: true } });
  if (existing && existing.id !== exceptId) {
    throw new AppError("Já existe um tutor com este CPF", 409, "DUPLICATE_CPF");
  }
}

export const tutorsService = {
  async list({ q, ...pagination }: ListTutorsQuery) {
    const terms = searchTerms(q);
    const where: Prisma.TutorWhereInput = {
      AND: terms.map((term) => ({
        OR: [
          { searchText: { contains: term } },
          // Também encontra o tutor pelo nome de um dos seus animais
          { patients: { some: { searchText: { contains: term } } } },
        ],
      })),
    };

    const [items, total] = await Promise.all([
      prisma.tutor.findMany({
        where,
        orderBy: { name: "asc" },
        ...toSkipTake(pagination),
        include: {
          patients: {
            select: { id: true, name: true, species: true, deceasedAt: true },
            orderBy: { name: "asc" },
          },
        },
      }),
      prisma.tutor.count({ where }),
    ]);

    return { items, total, ...pagination };
  },

  async get(id: string) {
    const tutor = await prisma.tutor.findUnique({
      where: { id },
      include: { patients: { orderBy: [{ deceasedAt: "asc" }, { name: "asc" }] } },
    });
    if (!tutor) throw new AppError("Tutor não encontrado", 404);
    return tutor;
  },

  async create(input: TutorInput) {
    await assertCpfAvailable(input.cpf);
    return prisma.tutor.create({ data: { ...input, searchText: tutorSearchText(input) } });
  },

  async update(id: string, input: TutorInput) {
    await this.get(id);
    await assertCpfAvailable(input.cpf, id);
    return prisma.tutor.update({
      where: { id },
      data: { ...input, searchText: tutorSearchText(input) },
    });
  },

  async remove(id: string) {
    const tutor = await prisma.tutor.findUnique({
      where: { id },
      include: { _count: { select: { patients: true } } },
    });
    if (!tutor) throw new AppError("Tutor não encontrado", 404);
    if (tutor._count.patients > 0) {
      throw new AppError(
        "Este tutor tem pacientes cadastrados. Transfira ou remova os pacientes antes.",
        409,
        "TUTOR_HAS_PATIENTS",
      );
    }
    await prisma.tutor.delete({ where: { id } });
  },
};
