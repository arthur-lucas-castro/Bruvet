import type { Request, Response } from "express";
import { clearSessionCookie, setSessionCookie } from "../../lib/session.js";
import { currentUser } from "../../middlewares/auth.js";
import { toPublicUser } from "../users/users.presenter.js";
import { changePasswordSchema, loginSchema } from "./auth.schemas.js";
import { authService } from "./auth.service.js";

export const authController = {
  async login(req: Request, res: Response) {
    const { email, password } = loginSchema.parse(req.body);
    const user = await authService.login(email, password);
    await setSessionCookie(res, { userId: user.id, tokenVersion: user.tokenVersion });
    res.json(toPublicUser(user));
  },

  logout(_req: Request, res: Response) {
    clearSessionCookie(res);
    res.status(204).end();
  },

  me(req: Request, res: Response) {
    res.json(currentUser(req));
  },

  async changePassword(req: Request, res: Response) {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const user = await authService.changePassword(currentUser(req).id, currentPassword, newPassword);
    // Renova a sessão deste dispositivo com a nova versão do token
    await setSessionCookie(res, { userId: user.id, tokenVersion: user.tokenVersion });
    res.json(toPublicUser(user));
  },
};
