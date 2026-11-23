export const ATTENDANCE_KINDS = [
  "consulta",
  "retorno",
  "emergencia",
  "vacinacao",
  "cirurgia",
  "exame",
  "internacao",
] as const;
export type AttendanceKind = (typeof ATTENDANCE_KINDS)[number];

export const ATTENDANCE_STATUSES = ["aberto", "finalizado", "cancelado"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

/** Grau de desidratação */
export const HYDRATION_LEVELS = ["normal", "leve", "moderada", "grave"] as const;

export const MUCOSA_TYPES = ["normocoradas", "hipocoradas", "hipercoradas", "ictericas", "cianoticas"] as const;
