import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { toQueryString, type Paginated } from '../../lib/pagination'
import { queryClient } from '../../lib/query-client'
import type { Tutor } from '../tutors/tutors-api'
import type { Sex, Size, Species } from './species'

export type Patient = {
  id: string
  code: number
  name: string
  species: Species
  breed: string | null
  sex: Sex
  neutered: boolean
  birthDate: string | null
  birthDateEstimated: boolean
  color: string | null
  microchip: string | null
  weightKg: number | null
  size: Size | null
  allergies: string | null
  chronicConditions: string | null
  notes: string | null
  deceasedAt: string | null
  tutorId: string
  createdAt: string
  updatedAt: string
}

export type PatientListItem = Patient & { tutor: Pick<Tutor, 'id' | 'name' | 'phone'> }
export type PatientDetail = Patient & { tutor: Tutor }

export type PatientInput = Omit<
  Patient,
  'id' | 'code' | 'createdAt' | 'updatedAt' | 'birthDate' | 'deceasedAt'
> & {
  /** AAAA-MM-DD ou null */
  birthDate: string | null
  deceasedAt: string | null
}

export type PatientStatus = 'ativos' | 'obitos' | 'todos'

export type PatientListParams = {
  q?: string
  species?: Species
  status?: PatientStatus
  page?: number
  pageSize?: number
}

export const patientKeys = {
  all: ['patients'] as const,
  list: (params: object) => ['patients', 'list', params] as const,
  detail: (id: string) => ['patients', 'detail', id] as const,
}

export function usePatients(params: PatientListParams) {
  return useQuery({
    queryKey: patientKeys.list(params),
    queryFn: () => api.get<Paginated<PatientListItem>>(`/patients${toQueryString(params)}`),
    placeholderData: keepPreviousData,
  })
}

export function usePatient(id: string | undefined) {
  return useQuery({
    queryKey: patientKeys.detail(id ?? ''),
    queryFn: () => api.get<PatientDetail>(`/patients/${id}`),
    enabled: Boolean(id),
  })
}

export function useSavePatient() {
  return useMutation({
    mutationFn: ({ id, ...input }: PatientInput & { id?: string }) =>
      id
        ? api.put<PatientListItem>(`/patients/${id}`, input)
        : api.post<PatientListItem>('/patients', input),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: patientKeys.all }),
        // A ficha do tutor lista os pacientes dele
        queryClient.invalidateQueries({ queryKey: ['tutors'] }),
      ]),
  })
}
