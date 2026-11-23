import { z } from "zod";
import { paginationSchema } from "../../lib/pagination.js";
import { optionalDateOnly, optionalEnum, optionalText } from "../../lib/validation.js";
import { SEXES, SIZES, SPECIES } from "./species.js";

const today = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
};

export const patientSchema = z
  .object({
    tutorId: z.string("Selecione o tutor").min(1, "Selecione o tutor"),
    name: z.string("Informe o nome").trim().min(1, "Informe o nome").max(80),
    species: z.enum(SPECIES, "Selecione a espécie"),
    breed: optionalText(80),
    sex: z.enum(SEXES, "Selecione o sexo"),
    neutered: z.boolean().default(false),
    birthDate: optionalDateOnly().refine(
      (d) => d === null || d <= today(),
      "A data de nascimento não pode estar no futuro",
    ),
    birthDateEstimated: z.boolean().default(false),
    color: optionalText(60),
    microchip: z
      .string()
      .nullish()
      .transform((v) => v?.replace(/\s/g, "").toUpperCase() || null)
      .refine((v) => v === null || /^[A-Z0-9]{9,20}$/.test(v), "Microchip inválido"),
    weightKg: z
      .number("Peso inválido")
      .positive("O peso precisa ser maior que zero")
      .max(2000, "Peso inválido")
      .nullish()
      .transform((v) => v ?? null),
    size: optionalEnum(SIZES, "Porte inválido"),
    allergies: optionalText(2000),
    chronicConditions: optionalText(2000),
    notes: optionalText(4000),
    deceasedAt: optionalDateOnly().refine(
      (d) => d === null || d <= today(),
      "A data do óbito não pode estar no futuro",
    ),
  })
  .refine((d) => !d.birthDate || !d.deceasedAt || d.deceasedAt >= d.birthDate, {
    message: "A data do óbito precisa ser posterior ao nascimento",
    path: ["deceasedAt"],
  });

export const listPatientsSchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  species: z.enum(SPECIES).optional(),
  status: z.enum(["ativos", "obitos", "todos"]).default("ativos"),
});

export type PatientInput = z.infer<typeof patientSchema>;
export type ListPatientsQuery = z.infer<typeof listPatientsSchema>;
