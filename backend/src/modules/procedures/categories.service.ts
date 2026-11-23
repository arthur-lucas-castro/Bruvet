import { AppError } from "../../lib/app-error.js";
import { prisma } from "../../lib/prisma.js";
import type { CategoryInput } from "./procedures.schemas.js";

async function assertNameAvailable(name: string, exceptId?: string) {
  // Compara sem diferenciar maiúsculas para evitar "Vacinas" e "vacinas"
  const all = await prisma.procedureCategory.findMany({ select: { id: true, name: true } });
  const clash = all.find((c) => c.name.toLowerCase() === name.toLowerCase() && c.id !== exceptId);
  if (clash) throw new AppError("Já existe uma categoria com este nome", 409, "DUPLICATE_CATEGORY");
}

export const categoriesService = {
  list() {
    return prisma.procedureCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { procedures: true } } },
    });
  },

  async create(input: CategoryInput) {
    await assertNameAvailable(input.name);
    const last = await prisma.procedureCategory.aggregate({ _max: { sortOrder: true } });
    return prisma.procedureCategory.create({
      data: { name: input.name, sortOrder: input.sortOrder ?? (last._max.sortOrder ?? 0) + 10 },
    });
  },

  async update(id: string, input: CategoryInput) {
    const category = await prisma.procedureCategory.findUnique({ where: { id } });
    if (!category) throw new AppError("Categoria não encontrada", 404);
    await assertNameAvailable(input.name, id);
    return prisma.procedureCategory.update({
      where: { id },
      data: { name: input.name, sortOrder: input.sortOrder },
    });
  },

  async remove(id: string) {
    const category = await prisma.procedureCategory.findUnique({
      where: { id },
      include: { _count: { select: { procedures: true } } },
    });
    if (!category) throw new AppError("Categoria não encontrada", 404);
    if (category._count.procedures > 0) {
      throw new AppError(
        "Esta categoria tem procedimentos. Mova-os para outra categoria antes de excluir.",
        409,
        "CATEGORY_HAS_PROCEDURES",
      );
    }
    await prisma.procedureCategory.delete({ where: { id } });
  },
};
