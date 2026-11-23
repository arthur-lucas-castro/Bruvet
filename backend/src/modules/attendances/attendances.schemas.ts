import { z } from "zod";
import { paginationSchema } from "../../lib/pagination.js";
import { optionalEnum, optionalText } from "../../lib/validation.js";
import { roundQuantity } from "../stock/units.js";
import {
  ATTENDANCE_KINDS,
  ATTENDANCE_STATUSES,
  HYDRATION_LEVELS,
  MUCOSA_TYPES,
} from "./attendances.constants.js";

/** Número opcional dentro de uma faixa clínica plausível. */
const optionalNumber = (min: number, max: number, message: string, integer = false) =>
  z
    .number(message)
    .min(min, message)
    .max(max, message)
    .refine((v) => !integer || Number.isInteger(v), message)
    .nullish()
    .transform((v) => (v == null ? null : Math.round(v * 100) / 100));

const longText = optionalText(10_000);

export const createAttendanceSchema = z.object({
  patientId: z.string("Selecione o paciente").min(1, "Selecione o paciente"),
  kind: z.enum(ATTENDANCE_KINDS, "Selecione o tipo de atendimento"),
  veterinarianId: z.string("Selecione o veterinário").min(1, "Selecione o veterinário"),
  chiefComplaint: optionalText(2000),
});

/** Ficha clínica (anamnese, exame físico e conclusão). Substitui todos os campos. */
export const clinicalSchema = z.object({
  kind: z.enum(ATTENDANCE_KINDS, "Selecione o tipo de atendimento"),
  veterinarianId: z.string("Selecione o veterinário").min(1, "Selecione o veterinário"),

  chiefComplaint: optionalText(2000),
  history: longText,
  diet: optionalText(2000),
  vaccination: optionalText(2000),
  environment: optionalText(2000),
  currentMedications: optionalText(2000),

  weightKg: optionalNumber(0.001, 2000, "Peso inválido"),
  temperatureC: optionalNumber(25, 45, "Temperatura fora da faixa (25–45 °C)"),
  heartRate: optionalNumber(1, 500, "Frequência cardíaca inválida", true),
  respiratoryRate: optionalNumber(1, 300, "Frequência respiratória inválida", true),
  capillaryRefillSec: optionalNumber(0, 20, "TPC inválido"),
  hydration: optionalEnum(HYDRATION_LEVELS, "Hidratação inválida"),
  mucosa: optionalEnum(MUCOSA_TYPES, "Mucosa inválida"),
  bodyCondition: optionalNumber(1, 9, "Escore corporal de 1 a 9", true),
  physicalExam: longText,

  diagnosis: optionalText(5000),
  treatmentPlan: longText,
});

export const listAttendancesSchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  status: z.enum([...ATTENDANCE_STATUSES, "todos"]).default("aberto"),
  veterinarianId: z.string().optional(),
  patientId: z.string().optional(),
});

export const noteSchema = z.object({
  text: z.string("Escreva a anotação").trim().min(1, "Escreva a anotação").max(10_000),
});

export const addProcedureSchema = z.object({
  procedureId: z.string("Selecione o procedimento").min(1, "Selecione o procedimento"),
  quantity: z.number().int("Quantidade inteira").min(1, "Mínimo 1").max(100).default(1),
  notes: optionalText(500),
});

export const addMedicationSchema = z.object({
  medicationId: z.string("Selecione o medicamento").min(1, "Selecione o medicamento"),
  quantity: z
    .number("Informe a quantidade")
    .positive("A quantidade precisa ser maior que zero")
    .max(100_000)
    .transform(roundQuantity),
  batchId: z.string().min(1).nullish(),
  reason: optionalText(500),
});

export const cancelSchema = z.object({
  reason: z.string("Informe o motivo").trim().min(3, "Informe o motivo").max(500),
});

export const reverseSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export type ClinicalInput = z.infer<typeof clinicalSchema>;
export type ListAttendancesQuery = z.infer<typeof listAttendancesSchema>;
