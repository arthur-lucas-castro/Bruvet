export const ROLES = ["admin", "veterinario", "enfermeiro", "recepcao"] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  veterinario: "Veterinário",
  enfermeiro: "Enfermagem",
  recepcao: "Recepção",
};
