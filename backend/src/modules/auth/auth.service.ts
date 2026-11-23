import { AppError } from "../../lib/app-error.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import { prisma } from "../../lib/prisma.js";

// Hash usado quando o e-mail não existe, para a resposta levar o mesmo tempo
// e não revelar quais e-mails estão cadastrados.
const dummyHashPromise = hashPassword("bruvet-dummy-password");

export const authService = {
  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    const valid = await verifyPassword(password, user?.passwordHash ?? (await dummyHashPromise));

    if (!user || !valid || !user.active) {
      throw new AppError("E-mail ou senha incorretos", 401, "INVALID_CREDENTIALS");
    }
    return user;
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
      throw new AppError("Senha atual incorreta", 400, "INVALID_PASSWORD");
    }

    // Incrementar tokenVersion encerra as sessões abertas em outros dispositivos
    return prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await hashPassword(newPassword),
        mustChangePassword: false,
        tokenVersion: { increment: 1 },
      },
    });
  },
};
