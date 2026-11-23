import type { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../../lib/app-error.js";
import { toSkipTake } from "../../lib/pagination.js";
import { prisma } from "../../lib/prisma.js";
import { buildSearchText, searchTerms } from "../../lib/search.js";
import { resolvePrice, sortVariants, variantKey, type PriceVariant } from "./pricing.js";
import type { ListProceduresQuery, ProcedureInput } from "./procedures.schemas.js";

const procedureSearchText = (input: ProcedureInput) =>
  buildSearchText(input.name, input.code, input.description);

const include = {
  category: { select: { id: true, name: true } },
  prices: { select: { id: true, species: true, size: true, priceCents: true } },
} as const;

type WithPrices = { prices: PriceVariant[] };
const withSortedPrices = <T extends WithPrices>(procedure: T): T => ({
  ...procedure,
  prices: sortVariants(procedure.prices),
});

async function assertCategoryExists(categoryId: string) {
  const category = await prisma.procedureCategory.findUnique({ where: { id: categoryId } });
  if (!category) throw new AppError("Categoria não encontrada", 400, "CATEGORY_NOT_FOUND");
}

async function assertCodeAvailable(code: string | null, exceptId?: string) {
  if (!code) return;
  const existing = await prisma.procedure.findUnique({ where: { code }, select: { id: true } });
  if (existing && existing.id !== exceptId) {
    throw new AppError("Já existe um procedimento com este código", 409, "DUPLICATE_CODE");
  }
}

type PriceChangeData = Omit<Prisma.ProcedurePriceChangeCreateManyInput, "procedureId">;

/** Compara preços antigos e novos (padrão + variações) e gera os registros de histórico. */
function diffPrices(
  before: { priceCents: number; prices: PriceVariant[] } | null,
  after: { priceCents: number; prices: PriceVariant[] },
  changedById: string,
): PriceChangeData[] {
  const changes: PriceChangeData[] = [];

  if (!before || before.priceCents !== after.priceCents) {
    changes.push({
      species: null,
      size: null,
      oldPriceCents: before?.priceCents ?? null,
      newPriceCents: after.priceCents,
      changedById,
    });
  }

  const oldByKey = new Map((before?.prices ?? []).map((p) => [variantKey(p), p]));
  const newByKey = new Map(after.prices.map((p) => [variantKey(p), p]));

  for (const [key, next] of newByKey) {
    const prev = oldByKey.get(key);
    if (!prev || prev.priceCents !== next.priceCents) {
      changes.push({
        species: next.species,
        size: next.size,
        oldPriceCents: prev?.priceCents ?? null,
        newPriceCents: next.priceCents,
        changedById,
      });
    }
  }
  for (const [key, prev] of oldByKey) {
    if (!newByKey.has(key)) {
      changes.push({
        species: prev.species,
        size: prev.size,
        oldPriceCents: prev.priceCents,
        newPriceCents: null,
        changedById,
      });
    }
  }

  return changes;
}

export const proceduresService = {
  async list({ q, categoryId, status, ...pagination }: ListProceduresQuery) {
    const where: Prisma.ProcedureWhereInput = {
      categoryId: categoryId || undefined,
      active: status === "ativos" ? true : status === "inativos" ? false : undefined,
      AND: searchTerms(q).map((term) => ({ searchText: { contains: term } })),
    };

    const [items, total] = await Promise.all([
      prisma.procedure.findMany({
        where,
        orderBy: [{ category: { sortOrder: "asc" } }, { category: { name: "asc" } }, { name: "asc" }],
        ...toSkipTake(pagination),
        include,
      }),
      prisma.procedure.count({ where }),
    ]);

    return { items: items.map(withSortedPrices), total, ...pagination };
  },

  async get(id: string) {
    const procedure = await prisma.procedure.findUnique({
      where: { id },
      include: {
        ...include,
        priceChanges: {
          orderBy: { changedAt: "desc" },
          take: 30,
          include: { changedBy: { select: { id: true, name: true } } },
        },
      },
    });
    if (!procedure) throw new AppError("Procedimento não encontrado", 404);
    return withSortedPrices(procedure);
  },

  /** Preço do procedimento para um paciente, conforme espécie e porte dele. */
  async priceForPatient(id: string, patientId: string) {
    const [procedure, patient] = await Promise.all([
      prisma.procedure.findUnique({ where: { id }, include: { prices: true } }),
      prisma.patient.findUnique({ where: { id: patientId }, select: { species: true, size: true } }),
    ]);
    if (!procedure) throw new AppError("Procedimento não encontrado", 404);
    if (!patient) throw new AppError("Paciente não encontrado", 404);

    const { priceCents, variant } = resolvePrice(procedure, patient);
    return {
      priceCents,
      variant: variant && { species: variant.species, size: variant.size },
      patient,
    };
  },

  async create({ prices, ...input }: ProcedureInput, actorId: string) {
    await assertCategoryExists(input.categoryId);
    await assertCodeAvailable(input.code);

    const procedure = await prisma.procedure.create({
      data: {
        ...input,
        searchText: procedureSearchText({ ...input, prices }),
        prices: { create: prices },
        // O preço inicial e as variações também entram no histórico
        priceChanges: {
          createMany: { data: diffPrices(null, { priceCents: input.priceCents, prices }, actorId) },
        },
      },
      include,
    });
    return withSortedPrices(procedure);
  },

  async update(id: string, { prices, ...input }: ProcedureInput, actorId: string) {
    const current = await prisma.procedure.findUnique({ where: { id }, include: { prices: true } });
    if (!current) throw new AppError("Procedimento não encontrado", 404);
    await assertCategoryExists(input.categoryId);
    await assertCodeAvailable(input.code, id);

    const changes = diffPrices(current, { priceCents: input.priceCents, prices }, actorId);

    // Substitui as variações e grava o histórico numa única transação
    const [, procedure] = await prisma.$transaction([
      prisma.procedurePrice.deleteMany({ where: { procedureId: id } }),
      prisma.procedure.update({
        where: { id },
        data: {
          ...input,
          searchText: procedureSearchText({ ...input, prices }),
          prices: { create: prices },
          priceChanges: changes.length ? { createMany: { data: changes } } : undefined,
        },
        include,
      }),
    ]);
    return withSortedPrices(procedure);
  },
};
