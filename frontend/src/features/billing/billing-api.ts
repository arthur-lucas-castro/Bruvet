import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { toQueryString, type Paginated } from '../../lib/pagination'
import { queryClient } from '../../lib/query-client'
import type { AttendanceKind, AttendanceStatus } from '../attendances/constants'
import type { Size, Species } from '../patients/species'
import type { Unit } from '../stock/units'

export const PAYMENT_METHODS = ['dinheiro', 'pix', 'debito', 'credito', 'outro'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  debito: 'Cartão de débito',
  credito: 'Cartão de crédito',
  outro: 'Outro',
}

export type BillStatus = 'aberta' | 'paga' | 'cancelada'

export const BILL_STATUS_LABELS: Record<BillStatus, string> = {
  aberta: 'Em aberto',
  paga: 'Paga',
  cancelada: 'Cancelada',
}

type UserRef = { id: string; name: string }

export type BillTotals = {
  proceduresCents: number
  medicationsCents: number
  extrasCents: number
  subtotalCents: number
  discountCents: number
  totalCents: number
  paidCents: number
  balanceCents: number
  status: BillStatus
}

export type Payment = {
  id: string
  amountCents: number
  method: PaymentMethod
  installments: number | null
  notes: string | null
  groupId: string | null
  receivedAt: string
  receivedBy: UserRef
  voidedAt: string | null
  voidedBy: UserRef | null
  voidReason: string | null
}

export type Bill = {
  id: string
  status: BillStatus
  discountCents: number
  discountReason: string | null
  discountBy: UserRef | null
  discountAt: string | null
  paidAt: string | null
  createdAt: string
  attendance: {
    id: string
    code: number
    kind: AttendanceKind
    status: AttendanceStatus
    startedAt: string
    finishedAt: string | null
    patient: {
      id: string
      name: string
      code: number
      species: Species
      tutor: { id: string; name: string; phone: string; cpf: string | null }
    }
    veterinarian: UserRef
    procedures: { id: string; name: string; priceCents: number; quantity: number; species: Species | null; size: Size | null }[]
    /** Só os medicamentos cobrados (com preço de venda, não estornados) */
    stockMovements: {
      id: string
      quantity: number
      salePriceCents: number | null
      medication: { id: string; name: string; unit: Unit }
    }[]
  }
  items: { id: string; description: string; quantity: number; unitPriceCents: number; addedBy: UserRef; createdAt: string }[]
  payments: Payment[]
  totals: BillTotals
}

const keys = {
  all: ['bills'] as const,
  list: (params: object) => ['bills', 'list', params] as const,
  detail: (id: string) => ['bills', 'detail', id] as const,
  byAttendance: (id: string) => ['bills', 'attendance', id] as const,
  settings: ['settings'] as const,
}

/** Comanda mudou: atualiza listas, detalhes e o financeiro. */
const invalidate = () =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: keys.all }),
    queryClient.invalidateQueries({ queryKey: ['finance'] }),
  ])

export function useBills(params: { q?: string; status?: BillStatus | 'todas'; tutorId?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: keys.list(params),
    queryFn: () => api.get<Paginated<Bill>>(`/bills${toQueryString(params)}`),
    placeholderData: keepPreviousData,
  })
}

export function useBill(id: string | undefined) {
  return useQuery({
    queryKey: keys.detail(id ?? ''),
    queryFn: () => api.get<Bill>(`/bills/${id}`),
    enabled: Boolean(id),
  })
}

export function useBillByAttendance(attendanceId: string) {
  return useQuery({
    queryKey: keys.byAttendance(attendanceId),
    queryFn: () => api.get<Bill>(`/bills/by-attendance/${attendanceId}`),
  })
}

export function useSettings() {
  return useQuery({
    queryKey: keys.settings,
    queryFn: () => api.get<{ discountLimitPercent: number }>('/settings'),
    staleTime: 5 * 60_000,
  })
}

export function useSaveSettings() {
  return useMutation({
    mutationFn: (input: { discountLimitPercent: number }) => api.put<{ discountLimitPercent: number }>('/settings', input),
    onSuccess: (data) => queryClient.setQueryData(keys.settings, data),
  })
}

export function useAddBillItem(billId: string) {
  return useMutation({
    mutationFn: (input: { description: string; quantity: number; unitPriceCents: number }) =>
      api.post<Bill>(`/bills/${billId}/items`, input),
    onSuccess: invalidate,
  })
}

export function useRemoveBillItem(billId: string) {
  return useMutation({
    mutationFn: (itemId: string) => api.delete<Bill>(`/bills/${billId}/items/${itemId}`),
    onSuccess: invalidate,
  })
}

export function useSetDiscount(billId: string) {
  return useMutation({
    mutationFn: (input: { amountCents: number; reason: string | null }) => api.put<Bill>(`/bills/${billId}/discount`, input),
    onSuccess: invalidate,
  })
}

type PaymentInput = { method: PaymentMethod; installments: number | null; notes: string | null }

export function usePayBill(billId: string) {
  return useMutation({
    mutationFn: (input: PaymentInput & { amountCents: number }) => api.post<Bill>(`/bills/${billId}/payments`, input),
    onSuccess: invalidate,
  })
}

export function usePayMany() {
  return useMutation({
    mutationFn: (input: PaymentInput & { billIds: string[] }) => api.post<Bill[]>('/bills/pay-many', input),
    onSuccess: invalidate,
  })
}

export function useVoidPayment() {
  return useMutation({
    mutationFn: ({ paymentId, reason }: { paymentId: string; reason: string }) =>
      api.post<Bill>(`/payments/${paymentId}/void`, { reason }),
    onSuccess: invalidate,
  })
}
