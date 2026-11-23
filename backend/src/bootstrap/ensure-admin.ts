import { env } from "../config/env.js";
import { generatePassword, hashPassword } from "../lib/password.js";
import { prisma } from "../lib/prisma.js";

/**
 * Na primeira inicialização (banco sem usuários) cria um administrador.
 * Ele terá de trocar a senha no primeiro acesso.
 */
export async function ensureAdmin() {
  const count = await prisma.user.count();
  if (count > 0) return;

  const password = env.ADMIN_PASSWORD ?? generatePassword();

  await prisma.user.create({
    data: {
      name: env.ADMIN_NAME,
      email: env.ADMIN_EMAIL.toLowerCase(),
      role: "admin",
      passwordHash: await hashPassword(password),
      mustChangePassword: true,
    },
  });

  console.log("──────────────────────────────────────────────");
  console.log(" Administrador inicial criado");
  console.log(`   E-mail: ${env.ADMIN_EMAIL}`);
  console.log(
    env.ADMIN_PASSWORD
      ? "   Senha:  a definida em ADMIN_PASSWORD"
      : `   Senha provisória: ${password}`,
  );
  console.log(" A troca de senha será exigida no primeiro acesso.");
  console.log("──────────────────────────────────────────────");
}
