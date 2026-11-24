import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { toQueryString } from '../../lib/pagination'
import { queryClient } from '../../lib/query-client'
import type { Role } from '../auth/auth-api'

export const SHIFT_KINDS = ['diurno', 'noturno', '24h'] as const
export type ShiftKind = (typeof SHIFT_KINDS)[number]

export const SHIFT_KIND_LABELS: Record<ShiftKind, string> = {
  diurno: 'Diurno',
  noturno: 'Noturno',
  '24h': '24 horas',
}

/** Horário padrão de cada tipo (o fim antes do início = termina no dia seguinte) */
export const SHIFT_KIND_HOURS: Record<ShiftKind, { start: string; end: string }> = {
  diurno: { start: '07:00', end: '19:00' },
  noturno: { start: '19:00', end: '07:00' },
  '24h': { start: '07:00', end: '07:00' },
}

export type ShiftState = 'agendado' | 'em_andamento' | 'realizado' | 'falta'

export const SHIFT_STATE_LABELS: Record<ShiftState, string> = {
  agendado: 'Agendado',
  em_andamento: 'Em andamento',
  realizado: 'Realizado',
  falta: 'Falta',
}

export type StaffMember = {
  id: string
  name: string
  role: Role
  crmv: string | null
  /** Só para o admin */
  rates: Record<ShiftKind, number | null> | null
}

export type Shift = {
  id: string
  kind: ShiftKind
  startsAt: string
  endsAt: string
  /** null = sem permissão para ver (só admin e o próprio profissional) */
  amountCents: number | null
  status: 'escalado' | 'falta'
  state: ShiftState
  notes: string | null
  paidAt: string | null
  paymentNotes: string | null
  createdAt: string
  user: { id: string; name: string; role: Role; crmv: string | null }
  paidBy: { id: string; name: string } | null
}

export type ShiftSummaryRow = {
  user: { id: string; name: string; role: Role }
  shifts: number
  done: number
  absences: number
  hours: number
  doneCents: number
  paidCents: number
  pendingCents: number
  scheduledCents: number
  pendingShiftIds: string[]
}

export type ShiftSummary = {
  rows: ShiftSummaryRow[]
  totals: { doneCents: number; paidCents: number; pendingCents: number; scheduledCents: number }
}

type Range = { from: string; until: string }

const invalidate = () =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: ['shifts'] }),
    queryClient.invalidateQueries({ queryKey: ['finance'] }),
  ])

export function useShifts(range: Range & { userId?: string }) {
  return useQuery({
    queryKey: ['shifts', 'list', range],
    queryFn: () => api.get<Shift[]>(`/shifts${toQueryString(range)}`),
    placeholderData: keepPreviousData,
  })
}

export function useStaff() {
  return useQuery({ queryKey: ['shifts', 'staff'], queryFn: () => api.get<StaffMember[]>('/shifts/staff') })
}

export function useShiftSummary(range: Range) {
  return useQuery({
    queryKey: ['shifts', 'summary', range],
    queryFn: () => api.get<ShiftSummary>(`/shifts/summary${toQueryString(range)}`),
    placeholderData: keepPreviousData,
  })
}

export type CreateShiftsInput = {
  userId: string
  kind: ShiftKind
  slots: { startsAt: string; endsAt: string }[]
  amountCents: number
  notes: string | null
}

export function useCreateShifts() {
  return useMutation({
    mutationFn: (input: CreateShiftsInput) => api.post<Shift[]>('/shifts', input),
    onSuccess: invalidate,
  })
}

export type UpdateShiftInput = Partial<{
  userId: string
  kind: ShiftKind
  startsAt: string
  endsAt: string
  amountCents: number
  status: 'escalado' | 'falta'
  notes: string | null
}>

export function useUpdateShift() {
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateShiftInput & { id: string }) => api.patch<Shift>(`/shifts/${id}`, input),
    onSuccess: invalidate,
  })
}

export function useDeleteShift() {
  return useMutation({ mutationFn: (id: string) => api.delete<void>(`/shifts/${id}`), onSuccess: invalidate })
}

export function usePayShifts() {
  return useMutation({
    mutationFn: (input: { shiftIds: string[]; notes: string | null }) => api.post<{ paid: number }>('/shifts/pay', input),
    onSuccess: invalidate,
  })
}

export function useUnpayShifts() {
  return useMutation({
    mutationFn: (shiftIds: string[]) => api.post<{ unpaid: number }>('/shifts/unpay', { shiftIds }),
    onSuccess: invalidate,
  })
}

export function useSaveRates() {
  return useMutation({
    mutationFn: ({ userId, ...rates }: Record<ShiftKind, number | null> & { userId: string }) =>
      api.put<Record<ShiftKind, number | null>>(`/shifts/rates/${userId}`, rates),
    onSuccess: invalidate,
  })
}

// ---------- Datas no calendário local ----------

const pad = (n: number) => String(n).padStart(2, '0')

/** Date → "AAAA-MM-DD" no calendário local */
export const dayInput = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

/** "AAAA-MM-DD" + "HH:MM" no fuso local → Date */
export function localDateTime(day: string, time: string, addDays = 0) {
  const [y, m, d] = day.split('-').map(Number)
  const [h, min] = time.split(':').map(Number)
  return new Date(y, m - 1, d + addDays, h, min)
}

/** Início e fim de um plantão: fim igual ou antes do início = termina no dia seguinte. */
export function slotFor(day: string, start: string, end: string) {
  const startsAt = localDateTime(day, start)
  const endsAt = localDateTime(day, end, end <= start ? 1 : 0)
  return { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() }
}

/** Segunda-feira (00:00 local) da semana de `date` */
export function weekStart(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}

export const addDays = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)

const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })
export const formatTime = (iso: string) => timeFormat.format(new Date(iso))

export const shiftHours = (shift: { startsAt: string; endsAt: string }) =>
  (new Date(shift.endsAt).getTime() - new Date(shift.startsAt).getTime()) / 3_600_000
