import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { toQueryString, type Paginated } from '../../lib/pagination'
import { queryClient } from '../../lib/query-client'
import type { Patient } from '../patients/patients-api'
import type { Species } from '../patients/species'

export type Tutor = {
  id: string
  name: string
  cpf: string | null
  phone: string
  phoneAlt: string | null
  email: string | null
  zipCode: string | null
  street: string | null
  number: string | null
  complement: string | null
  district: string | null
  city: string | null
  state: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type TutorListItem = Tutor & {
  patients: { id: string; name: string; species: Species; deceasedAt: string | null }[]
}

export type TutorDetail = Tutor & { patients: Patient[] }

/** Dados enviados no cadastro/edição (máscaras podem ir junto; o backend remove). */
export type TutorInput = Omit<Tutor, 'id' | 'createdAt' | 'updatedAt'>

export const tutorKeys = {
  all: ['tutors'] as const,
  list: (params: object) => ['tutors', 'list', params] as const,
  detail: (id: string) => ['tutors', 'detail', id] as const,
}

const invalidateAll = () =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: tutorKeys.all }),
    // A lista de pacientes mostra nome e telefone do tutor
    queryClient.invalidateQueries({ queryKey: ['patients'] }),
  ])

export function useTutors(params: { q?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: tutorKeys.list(params),
    queryFn: () => api.get<Paginated<TutorListItem>>(`/tutors${toQueryString(params)}`),
    placeholderData: keepPreviousData,
  })
}

export function useTutor(id: string | undefined) {
  return useQuery({
    queryKey: tutorKeys.detail(id ?? ''),
    queryFn: () => api.get<TutorDetail>(`/tutors/${id}`),
    enabled: Boolean(id),
  })
}

export function useSaveTutor() {
  return useMutation({
    mutationFn: ({ id, ...input }: TutorInput & { id?: string }) =>
      id ? api.put<Tutor>(`/tutors/${id}`, input) : api.post<Tutor>('/tutors', input),
    onSuccess: invalidateAll,
  })
}

export function useDeleteTutor() {
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/tutors/${id}`),
    onSuccess: invalidateAll,
  })
}
