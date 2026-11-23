import type { Request, RequestHandler } from "express";
import { AppError } from "../lib/app-error.js";
import { prisma } from "../lib/prisma.js";
import { SESSION_COOKIE, readSessionToken } from "../lib/session.js";
import type { Role } from "../modules/users/roles.js";
import { toPublicUser, type PublicUser } from "../modules/users/users.presenter.js";

type AuthenticateOptions = {
  /** Libera a rota mesmo com troca de senha pendente (ex.: /auth/me, /auth/password). */
  allowPendingPasswordChange?: boolean;
};

/** Exige uma sessão válida e coloca o usuário em `req.user`. */
export function authenticate(options: AuthenticateOptions = {}): RequestHandler {
  return async (req, _res, next) => {
    const token: unknown = req.cookies?.[SESSION_COOKIE];
    const session = typeof token === "string" ? await readSessionToken(token) : null;
    if (!session) throw new AppError("Sessão expirada. Entre novamente.", 401, "UNAUTHENTICATED");

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || !user.active || user.tokenVersion !== session.tokenVersion) {
      throw new AppError("Sessão expirada. Entre novamente.", 401, "UNAUTHENTICATED");
    }

    if (user.mustChangePassword && !options.allowPendingPasswordChange) {
      throw new AppError("Troque sua senha para continuar.", 403, "PASSWORD_CHANGE_REQUIRED");
    }

    req.user = toPublicUser(user);
    next();
  };
}

/** Exige que o usuário autenticado tenha um dos perfis informados. Use depois de `authenticate`. */
export function authorize(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError("Você não tem permissão para esta ação.", 403, "FORBIDDEN");
    }
    next();
  };
}

/** Usuário autenticado; só use em rotas protegidas por `authenticate`. */
export function currentUser(req: Request): PublicUser {
  if (!req.user) throw new AppError("Sessão expirada. Entre novamente.", 401, "UNAUTHENTICATED");
  return req.user;
}
