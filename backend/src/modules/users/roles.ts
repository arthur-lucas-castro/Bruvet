export const ROLES = ["admin", "veterinario", "recepcao"] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  veterinario: "Veterinário",
  recepcao: "Recepção",
};
