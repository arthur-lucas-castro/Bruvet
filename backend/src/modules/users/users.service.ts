import { AppError } from "../../lib/app-error.js";
import { hashPassword } from "../../lib/password.js";
import { prisma } from "../../lib/prisma.js";
import type { CreateUserInput, UpdateUserInput } from "./users.schemas.js";
import { toPublicUser } from "./users.presenter.js";

async function findOrFail(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError("Usuário não encontrado", 404);
  return user;
}

export const usersService = {
  async list() {
    const users = await prisma.user.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });
    return users.map(toPublicUser);
  },

  async create(input: CreateUserInput) {
    const exists = await prisma.user.findUnique({ where: { email: input.email } });
    if (exists) throw new AppError("Já existe um usuário com este e-mail", 409);

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        role: input.role,
        crmv: input.crmv ?? null,
        passwordHash: await hashPassword(input.password),
        mustChangePassword: true,
      },
    });
    return toPublicUser(user);
  },

  async update(id: string, input: UpdateUserInput, actorId: string) {
    const user = await findOrFail(id);

    const role = input.role ?? user.role;
    const active = input.active ?? user.active;
    const crmv = input.crmv === undefined ? user.crmv : input.crmv;

    if (role === "veterinario" && !crmv) {
      throw new AppError("Informe o CRMV do veterinário", 400);
    }

    // Evita que o sistema fique sem administrador ativo
    const losesAdmin = user.role === "admin" && user.active && (role !== "admin" || !active);
    if (losesAdmin) {
      if (id === actorId) {
        throw new AppError("Você não pode remover seu próprio acesso de administrador", 400);
      }
      const otherAdmins = await prisma.user.count({
        where: { role: "admin", active: true, id: { not: id } },
      });
      if (otherAdmins === 0) throw new AppError("O sistema precisa de pelo menos um administrador ativo", 400);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        name: input.name,
        role,
        crmv,
        active,
        // Desativar encerra as sessões abertas do usuário
        tokenVersion: user.active && !active ? { increment: 1 } : undefined,
      },
    });
    return toPublicUser(updated);
  },

  /** Define uma senha provisória; o usuário terá de trocá-la no próximo acesso. */
  async resetPassword(id: string, password: string) {
    await findOrFail(id);
    const updated = await prisma.user.update({
      where: { id },
      data: {
        passwordHash: await hashPassword(password),
        mustChangePassword: true,
        tokenVersion: { increment: 1 },
      },
    });
    return toPublicUser(updated);
  },
};
