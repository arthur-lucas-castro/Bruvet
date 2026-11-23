import type { PublicUser } from "../modules/users/users.presenter.js";

declare global {
  namespace Express {
    interface Request {
      /** Usuário autenticado, preenchido pelo middleware `authenticate`. */
      user?: PublicUser;
    }
  }
}

export {};
