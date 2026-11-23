import { z } from "zod";
import { ROLES } from "./roles.js";

export const passwordSchema = z
  .string()
  .min(8, "A senha precisa de pelo menos 8 caracteres")
  .max(128, "A senha pode ter no máximo 128 caracteres");

const nameSchema = z.string().trim().min(2, "Informe o nome").max(120);
const crmvSchema = z
  .string()
  .trim()
  .max(30)
  .transform((value) => value || null)
  .nullish();

export const createUserSchema = z
  .object({
    name: nameSchema,
    email: z.email("E-mail inválido").trim().toLowerCase(),
    role: z.enum(ROLES, "Perfil inválido"),
    crmv: crmvSchema,
    password: passwordSchema,
  })
  .refine((data) => data.role !== "veterinario" || data.crmv, {
    message: "Informe o CRMV do veterinário",
    path: ["crmv"],
  });

export const updateUserSchema = z
  .object({
    name: nameSchema,
    role: z.enum(ROLES, "Perfil inválido"),
    crmv: crmvSchema,
    active: z.boolean(),
  })
  .partial();

export const resetPasswordSchema = z.object({ password: passwordSchema });

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
