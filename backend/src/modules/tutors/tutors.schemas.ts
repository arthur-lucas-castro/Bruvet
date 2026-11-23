import { z } from "zod";
import { paginationSchema } from "../../lib/pagination.js";
import {
  BRAZIL_STATES,
  isValidCpf,
  onlyDigits,
  optionalDigits,
  optionalEnum,
  optionalText,
} from "../../lib/validation.js";

const phone = z
  .string("Informe o telefone")
  .transform(onlyDigits)
  .pipe(z.string().regex(/^\d{10,11}$/, "Telefone inválido (DDD + número)"));

export const tutorSchema = z.object({
  name: z.string("Informe o nome").trim().min(2, "Informe o nome").max(120),
  cpf: optionalDigits().refine((v) => v === null || isValidCpf(v), "CPF inválido"),
  phone,
  phoneAlt: optionalDigits().refine(
    (v) => v === null || /^\d{10,11}$/.test(v),
    "Telefone inválido (DDD + número)",
  ),
  email: z
    .union([z.email("E-mail inválido").trim().toLowerCase(), z.literal("")])
    .nullish()
    .transform((v) => v || null),
  zipCode: optionalDigits().refine((v) => v === null || v.length === 8, "CEP inválido"),
  street: optionalText(120),
  number: optionalText(20),
  complement: optionalText(80),
  district: optionalText(80),
  city: optionalText(80),
  state: optionalEnum(BRAZIL_STATES, "UF inválida"),
  notes: optionalText(2000),
});

export const listTutorsSchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
});

export type TutorInput = z.infer<typeof tutorSchema>;
export type ListTutorsQuery = z.infer<typeof listTutorsSchema>;
