import { z } from "zod";
import { passwordSchema } from "../users/users.schemas.js";

export const loginSchema = z.object({
  email: z.email("E-mail inválido").trim().toLowerCase(),
  password: z.string().min(1, "Informe a senha").max(128),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual").max(128),
    newPassword: passwordSchema,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "A nova senha precisa ser diferente da atual",
    path: ["newPassword"],
  });
