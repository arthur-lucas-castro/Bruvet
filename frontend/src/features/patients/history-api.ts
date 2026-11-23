import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { toQueryString, type Paginated } from '../../lib/pagination'
import type { AttendanceKind, AttendanceStatus } from '../attendances/constants'
import type { Unit } from '../stock/units'
import type { Size, Species } from './species'

export type HistoryType = 'todos' | 'atendimentos' | 'medicamentos' | 'pesos'

type MedicationRef = { id: string; name: string; unit: Unit; controlled: boolean }

export type HistoryAttendance = {
  id: string
  code: number
  kind: AttendanceKind
  status: AttendanceStatus
  startedAt: string
  finishedAt: string | null
  cancelReason: string | null
  chiefComplaint: string | null
  diagnosis: string | null
  treatmentPlan: string | null
  weightKg: number | null
  temperatureC: number | null
  heartRate: number | null
  respiratoryRate: number | null
  veterinarian: { id: string; name: string; crmv: string | null }
  procedures: { id: string; name: string; quantity: number; priceCents: number; species: Species | null; size: Size | null }[]
  stockMovements: { id: string; quantity: number; medication: MedicationRef }[]
  notes: { id: string; text: string; createdAt: string; author: { name: string } }[]
  totalCents: number
}

export type HistoryEvent =
  | { type: 'atendimento'; at: string; attendance: HistoryAttendance }
  | {
      type: 'medicamento'
      at: string
      movement: {
        id: string
        quantity: number
        reason: string | null
        medication: MedicationRef
        batch: { batchNumber: string }
        user: { name: string }
        attendance: { id: string; code: number } | null
      }
    }
  | {
      type: 'peso'
      at: string
      weight: { id: string; weightKg: number; source: 'cadastro' | 'atendimento'; recordedBy: { name: string } | null }
    }
  | { type: 'cadastro'; at: string }
  | { type: 'obito'; at: string }

export type WeightPoint = {
  id: string
  weightKg: number
  recordedAt: string
  source: 'cadastro' | 'atendimento'
  attendanceId: string | null
}

export type HistorySummary = {
  weights: WeightPoint[]
  vaccines: { id: string; name: string; createdAt: string; attendanceId: string }[]
  medications: { medication: MedicationRef; times: number; totalQuantity: number; lastAt: string }[]
  attendances: {
    finished: number
    open: number
    cancelled: number
    last: { id: string; kind: AttendanceKind; startedAt: string; diagnosis: string | null } | null
  }
}

export type HistoryFilters = {
  type: HistoryType
  /** Instantes ISO: início incluso, fim excluso */
  from?: string
  until?: string
}

const PAGE_SIZE = 15

export function useHistorySummary(patientId: string) {
  return useQuery({
    queryKey: ['patients', 'history', patientId, 'summary'],
    queryFn: () => api.get<HistorySummary>(`/patients/${patientId}/history/summary`),
  })
}

/** Linha do tempo paginada com "carregar mais". */
export function useHistoryEvents(patientId: string, filters: HistoryFilters) {
  return useInfiniteQuery({
    queryKey: ['patients', 'history', patientId, 'events', filters],
    queryFn: ({ pageParam }) =>
      api.get<Paginated<HistoryEvent>>(
        `/patients/${patientId}/history/events${toQueryString({ ...filters, page: pageParam, pageSize: PAGE_SIZE })}`,
      ),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
  })
}
