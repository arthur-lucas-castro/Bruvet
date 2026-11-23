import { z } from "zod";

export const onlyDigits = (value: string) => value.replace(/\D/g, "");

/** Texto opcional: espaços aparados; vazio vira null. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo de ${max} caracteres`)
    .nullish()
    .transform((value) => value || null);

/** Dígitos opcionais (remove máscara); vazio vira null. */
export const optionalDigits = () =>
  z
    .string()
    .nullish()
    .transform((value) => (value ? onlyDigits(value) : "") || null);

export function isValidCpf(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const digits = cpf.split("").map(Number);
  for (const length of [9, 10]) {
    const sum = digits.slice(0, length).reduce((acc, d, i) => acc + d * (length + 1 - i), 0);
    const check = ((sum * 10) % 11) % 10;
    if (check !== digits[length]) return false;
  }
  return true;
}

/** Data no formato AAAA-MM-DD, convertida para meia-noite UTC. */
export const dateOnly = () =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")
    .transform((value) => new Date(`${value}T00:00:00.000Z`))
    .refine((date) => !Number.isNaN(date.getTime()), "Data inválida");

export const optionalDateOnly = () =>
  z
    .union([dateOnly(), z.literal("")])
    .nullish()
    .transform((value) => (value instanceof Date ? value : null));

/** Valor opcional de uma lista fixa; "" e ausente viram null, inválido mostra `message`. */
export const optionalEnum = <const T extends readonly [string, ...string[]]>(values: T, message: string) =>
  z.preprocess(
    (value) => (value === "" || value === undefined ? null : value),
    z.enum(values, message).nullable(),
  );

export const BRAZIL_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;
