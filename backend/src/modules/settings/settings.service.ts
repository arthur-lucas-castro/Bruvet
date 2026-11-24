import { z } from "zod";
import { prisma } from "../../lib/prisma.js";

/** Configurações editáveis pelo admin, com valor padrão quando ainda não existem no banco. */
const DEFINITIONS = {
  discount_limit_percent: { default: "10", schema: z.coerce.number().int().min(0).max(100) },
} as const;

type SettingKey = keyof typeof DEFINITIONS;

export const settingsSchema = z.object({
  discountLimitPercent: z
    .number("Informe o limite")
    .int("Use um número inteiro")
    .min(0, "Mínimo 0%")
    .max(100, "Máximo 100%"),
});

async function read(key: SettingKey): Promise<number> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return DEFINITIONS[key].schema.parse(row?.value ?? DEFINITIONS[key].default);
}

export const settingsService = {
  /** Limite de desconto (%) que veterinários e recepção podem aplicar numa comanda. */
  discountLimitPercent: () => read("discount_limit_percent"),

  async all() {
    return { discountLimitPercent: await read("discount_limit_percent") };
  },

  async update(input: z.infer<typeof settingsSchema>, actorId: string) {
    await prisma.setting.upsert({
      where: { key: "discount_limit_percent" },
      create: { key: "discount_limit_percent", value: String(input.discountLimitPercent), updatedById: actorId },
      update: { value: String(input.discountLimitPercent), updatedById: actorId },
    });
    return this.all();
  },
};
