import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { toQueryString, type Paginated } from '../../lib/pagination'
import { queryClient } from '../../lib/query-client'
import type { MovementType, Unit } from './units'

export type StockStatus = 'ok' | 'baixo' | 'sem_estoque'

export type StockSummary = {
  available: number
  expiredQuantity: number
  nextExpiry: string | null
  expiringSoon: boolean
  status: StockStatus
  belowMinimum: boolean
}

export type Medication = {
  id: string
  name: string
  activeIngredient: string | null
  presentation: string | null
  concentration: string | null
  manufacturer: string | null
  unit: Unit
  minStock: number
  controlled: boolean
  notes: string | null
  active: boolean
  createdAt: string
  updatedAt: string
  stock: StockSummary
}

export type StockBatch = {
  id: string
  batchNumber: string
  expiresAt: string
  quantity: number
  unitCostCents: number | null
  supplier: string | null
  expired: boolean
  expiringSoon: boolean
}

export type MedicationDetail = Medication & { batches: StockBatch[] }

export type StockMovement = {
  id: string
  type: MovementType
  quantity: number
  balanceAfter: number
  reason: string | null
  createdAt: string
  batch: { id: string; batchNumber: string }
  user: { id: string; name: string }
  patient: { id: string; name: string; code: number } | null
  attendance: { id: string; code: number } | null
}

export type MedicationInput = Omit<Medication, 'id' | 'createdAt' | 'updatedAt' | 'stock'>

export type StockFilter = 'todos' | 'baixo' | 'vencendo' | 'vencido'
export type ActiveFilter = 'ativos' | 'inativos' | 'todos'

type AlertMedication = { id: string; name: string; unit: Unit }
type AlertBatch = {
  medication: AlertMedication
  batchId: string
  batchNumber: string
  expiresAt: string
  quantity: number
}
export type StockAlerts = {
  lowStock: (AlertMedication & { available: number; minStock: number })[]
  expiring: AlertBatch[]
  expired: AlertBatch[]
}

export const stockKeys = {
  all: ['stock'] as const,
  list: (params: object) => ['stock', 'medications', params] as const,
  detail: (id: string) => ['stock', 'medication', id] as const,
  movements: (id: string, page: number) => ['stock', 'movements', id, page] as const,
  alerts: ['stock', 'alerts'] as const,
}

/** Qualquer movimentação muda saldo, alertas e histórico: atualiza tudo do estoque. */
const invalidateStock = () => queryClient.invalidateQueries({ queryKey: stockKeys.all })

export function useMedications(params: {
  q?: string
  status?: StockFilter
  situacao?: ActiveFilter
  page?: number
  pageSize?: number
}) {
  return useQuery({
    queryKey: stockKeys.list(params),
    queryFn: () => api.get<Paginated<Medication>>(`/medications${toQueryString(params)}`),
    placeholderData: keepPreviousData,
  })
}

export function useMedication(id: string | undefined) {
  return useQuery({
    queryKey: stockKeys.detail(id ?? ''),
    queryFn: () => api.get<MedicationDetail>(`/medications/${id}`),
    enabled: Boolean(id),
  })
}

export function useMovements(id: string, page: number) {
  return useQuery({
    queryKey: stockKeys.movements(id, page),
    queryFn: () =>
      api.get<Paginated<StockMovement>>(`/medications/${id}/movements${toQueryString({ page, pageSize: 15 })}`),
    placeholderData: keepPreviousData,
  })
}

export function useStockAlerts() {
  return useQuery({ queryKey: stockKeys.alerts, queryFn: () => api.get<StockAlerts>('/stock/alerts') })
}

export function useSaveMedication() {
  return useMutation({
    mutationFn: ({ id, ...input }: MedicationInput & { id?: string }) =>
      id ? api.put<Medication>(`/medications/${id}`, input) : api.post<Medication>('/medications', input),
    onSuccess: invalidateStock,
  })
}

export function useStockEntry(medicationId: string) {
  return useMutation({
    mutationFn: (input: {
      batchNumber: string
      expiresAt: string
      quantity: number
      unitCostCents: number | null
      supplier: string | null
      reason: string | null
    }) => api.post(`/medications/${medicationId}/entries`, input),
    onSuccess: invalidateStock,
  })
}

export function useStockExit(medicationId: string) {
  return useMutation({
    mutationFn: (input: {
      quantity: number
      batchId: string | null
      patientId: string | null
      reason: string | null
    }) => api.post(`/medications/${medicationId}/exits`, input),
    onSuccess: invalidateStock,
  })
}

export function useBatchAdjust() {
  return useMutation({
    mutationFn: ({
      batchId,
      ...input
    }: {
      batchId: string
      type: 'ajuste' | 'perda'
      quantity: number
      reason: string
    }) => api.post(`/stock/batches/${batchId}/adjust`, input),
    onSuccess: invalidateStock,
  })
}
