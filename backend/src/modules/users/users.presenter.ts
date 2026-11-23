import type { User } from "../../generated/prisma/client.js";
import type { Role } from "./roles.js";

/** Formato do usuário devolvido pela API (sem hash de senha nem tokenVersion). */
export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  crmv: string | null;
  active: boolean;
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    crmv: user.crmv,
    active: user.active,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
