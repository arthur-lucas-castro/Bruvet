export const ATTENDANCE_KINDS = [
  'consulta',
  'retorno',
  'emergencia',
  'vacinacao',
  'cirurgia',
  'exame',
  'internacao',
] as const
export type AttendanceKind = (typeof ATTENDANCE_KINDS)[number]

export const KIND_LABELS: Record<AttendanceKind, string> = {
  consulta: 'Consulta',
  retorno: 'Retorno',
  emergencia: 'Emergência',
  vacinacao: 'Vacinação',
  cirurgia: 'Cirurgia',
  exame: 'Exame',
  internacao: 'Internação',
}

export type AttendanceStatus = 'aberto' | 'finalizado' | 'cancelado'

export const STATUS_LABELS: Record<AttendanceStatus, string> = {
  aberto: 'Em andamento',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
}

export const HYDRATION_LEVELS = ['normal', 'leve', 'moderada', 'grave'] as const
export const HYDRATION_LABELS: Record<(typeof HYDRATION_LEVELS)[number], string> = {
  normal: 'Normo-hidratado',
  leve: 'Desidratação leve (até 6%)',
  moderada: 'Desidratação moderada (6–8%)',
  grave: 'Desidratação grave (acima de 8%)',
}

export const MUCOSA_TYPES = ['normocoradas', 'hipocoradas', 'hipercoradas', 'ictericas', 'cianoticas'] as const
export const MUCOSA_LABELS: Record<(typeof MUCOSA_TYPES)[number], string> = {
  normocoradas: 'Normocoradas',
  hipocoradas: 'Hipocoradas',
  hipercoradas: 'Hipercoradas',
  ictericas: 'Ictéricas',
  cianoticas: 'Cianóticas',
}

export const formatAttendanceCode = (code: number) => String(code).padStart(6, '0')
