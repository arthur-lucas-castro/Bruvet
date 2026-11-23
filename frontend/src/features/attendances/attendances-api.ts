import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { toQueryString, type Paginated } from '../../lib/pagination'
import { queryClient } from '../../lib/query-client'
import type { Role } from '../auth/auth-api'
import type { Patient } from '../patients/patients-api'
import type { Size, Species } from '../patients/species'
import type { Unit } from '../stock/units'
import type { AttendanceKind, AttendanceStatus } from './constants'

export type Veterinarian = { id: string; name: string; crmv: string | null }

/** Campos clínicos editáveis (anamnese, exame físico e conclusão). */
export type ClinicalFields = {
  kind: AttendanceKind
  veterinarianId: string
  chiefComplaint: string | null
  history: string | null
  diet: string | null
  vaccination: string | null
  environment: string | null
  currentMedications: string | null
  weightKg: number | null
  temperatureC: number | null
  heartRate: number | null
  respiratoryRate: number | null
  capillaryRefillSec: number | null
  hydration: string | null
  mucosa: string | null
  bodyCondition: number | null
  physicalExam: string | null
  diagnosis: string | null
  treatmentPlan: string | null
}

export type AttendanceListItem = {
  id: string
  code: number
  kind: AttendanceKind
  status: AttendanceStatus
  startedAt: string
  finishedAt: string | null
  chiefComplaint: string | null
  diagnosis: string | null
  patient: { id: string; name: string; code: number; species: Species; tutor: { id: string; name: string } }
  veterinarian: { id: string; name: string }
  _count: { procedures: number }
}

export type AttendanceNote = {
  id: string
  text: string
  createdAt: string
  author: { id: string; name: string; role: Role }
}

export type AttendanceProcedureItem = {
  id: string
  procedureId: string
  name: string
  priceCents: number
  quantity: number
  species: Species | null
  size: Size | null
  notes: string | null
  createdAt: string
  addedBy: { id: string; name: string }
}

export type AttendanceMovement = {
  id: string
  type: 'saida' | 'estorno'
  quantity: number
  reason: string | null
  createdAt: string
  reversalOfId: string | null
  medication: { id: string; name: string; unit: Unit; controlled: boolean }
  batch: { id: string; batchNumber: string }
  user: { id: string; name: string }
  reversedBy: { id: string; createdAt: string } | null
}

export type AttendanceDetail = ClinicalFields & {
  id: string
  code: number
  status: AttendanceStatus
  startedAt: string
  finishedAt: string | null
  cancelReason: string | null
  patient: Patient & { tutor: { id: string; name: string; phone: string } }
  veterinarian: Veterinarian
  createdBy: { id: string; name: string }
  notes: AttendanceNote[]
  procedures: AttendanceProcedureItem[]
  stockMovements: AttendanceMovement[]
  totalCents: number
}

export type AttendanceListParams = {
  q?: string
  status?: AttendanceStatus | 'todos'
  veterinarianId?: string
  patientId?: string
  page?: number
  pageSize?: number
}

export const attendanceKeys = {
  all: ['attendances'] as const,
  list: (params: object) => ['attendances', 'list', params] as const,
  detail: (id: string) => ['attendances', 'detail', id] as const,
  veterinarians: ['attendances', 'veterinarians'] as const,
}

function invalidate(id?: string) {
  return Promise.all([
    id
      ? queryClient.invalidateQueries({ queryKey: attendanceKeys.detail(id) })
      : Promise.resolve(),
    queryClient.invalidateQueries({ queryKey: ['attendances', 'list'] }),
  ])
}

/** Uso de medicamento mexe no estoque: atualiza também saldos e alertas. */
const invalidateStock = () => queryClient.invalidateQueries({ queryKey: ['stock'] })

export function useVeterinarians() {
  return useQuery({
    queryKey: attendanceKeys.veterinarians,
    queryFn: () => api.get<Veterinarian[]>('/attendances/veterinarians'),
    staleTime: 5 * 60_000,
  })
}

export function useAttendances(params: AttendanceListParams) {
  return useQuery({
    queryKey: attendanceKeys.list(params),
    queryFn: () => api.get<Paginated<AttendanceListItem>>(`/attendances${toQueryString(params)}`),
    placeholderData: keepPreviousData,
  })
}

export function useAttendance(id: string | undefined) {
  return useQuery({
    queryKey: attendanceKeys.detail(id ?? ''),
    queryFn: () => api.get<AttendanceDetail>(`/attendances/${id}`),
    enabled: Boolean(id),
  })
}

export function useCreateAttendance() {
  return useMutation({
    mutationFn: (input: {
      patientId: string
      kind: AttendanceKind
      veterinarianId: string
      chiefComplaint: string | null
    }) => api.post<{ id: string }>('/attendances', input),
    onSuccess: () => invalidate(),
  })
}

export function useSaveClinical(id: string) {
  return useMutation({
    mutationFn: (input: ClinicalFields) => api.put(`/attendances/${id}/clinical`, input),
    onSuccess: () => invalidate(id),
  })
}

export function useAttendanceAction(id: string) {
  return useMutation({
    mutationFn: ({ action, reason }: { action: 'finish' | 'cancel' | 'reopen'; reason?: string }) =>
      api.post(`/attendances/${id}/${action}`, reason ? { reason } : undefined),
    onSuccess: () =>
      // Finalizar atualiza o peso do paciente
      Promise.all([invalidate(id), queryClient.invalidateQueries({ queryKey: ['patients'] })]),
  })
}

export function useAddNote(id: string) {
  return useMutation({
    mutationFn: (text: string) => api.post<AttendanceNote>(`/attendances/${id}/notes`, { text }),
    onSuccess: () => invalidate(id),
  })
}

export function useAddProcedure(id: string) {
  return useMutation({
    mutationFn: (input: { procedureId: string; quantity: number; notes: string | null }) =>
      api.post(`/attendances/${id}/procedures`, input),
    onSuccess: () => invalidate(id),
  })
}

export function useRemoveProcedure(id: string) {
  return useMutation({
    mutationFn: (itemId: string) => api.delete(`/attendances/${id}/procedures/${itemId}`),
    onSuccess: () => invalidate(id),
  })
}

export function useAddMedication(id: string) {
  return useMutation({
    mutationFn: (input: { medicationId: string; quantity: number; batchId: string | null; reason: string | null }) =>
      api.post(`/attendances/${id}/medications`, input),
    onSuccess: () => Promise.all([invalidate(id), invalidateStock()]),
  })
}

export function useReverseMedication(id: string) {
  return useMutation({
    mutationFn: (movementId: string) => api.post(`/attendances/${id}/medications/${movementId}/reverse`, {}),
    onSuccess: () => Promise.all([invalidate(id), invalidateStock()]),
  })
}

/** Preço do procedimento para o paciente (variação por espécie/porte). */
export function useProcedurePrice(procedureId: string | undefined, patientId: string) {
  return useQuery({
    queryKey: ['procedures', 'price', procedureId, patientId],
    queryFn: () =>
      api.get<{ priceCents: number; variant: { species: Species | null; size: Size | null } | null }>(
        `/procedures/${procedureId}/price?patientId=${patientId}`,
      ),
    enabled: Boolean(procedureId),
  })
}
