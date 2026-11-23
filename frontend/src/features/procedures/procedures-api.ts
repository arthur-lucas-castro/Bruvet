import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { toQueryString, type Paginated } from '../../lib/pagination'
import { queryClient } from '../../lib/query-client'
import type { Size, Species } from '../patients/species'

export type ProcedureCategory = {
  id: string
  name: string
  sortOrder: number
  _count: { procedures: number }
}

export type PriceVariant = {
  species: Species | null
  size: Size | null
  priceCents: number
}

export type Procedure = {
  id: string
  code: string | null
  name: string
  description: string | null
  preparation: string | null
  /** Valor padrão, usado quando nenhuma variação se aplica */
  priceCents: number
  /** Variações por espécie e/ou porte, já ordenadas */
  prices: (PriceVariant & { id: string })[]
  durationMinutes: number | null
  active: boolean
  categoryId: string
  category: { id: string; name: string }
  createdAt: string
  updatedAt: string
}

export type PriceChange = {
  id: string
  /** Variação alterada; ambos null = valor padrão */
  species: Species | null
  size: Size | null
  /** null = variação criada (ou cadastro) */
  oldPriceCents: number | null
  /** null = variação removida */
  newPriceCents: number | null
  changedAt: string
  changedBy: { id: string; name: string }
}

export type ProcedureDetail = Procedure & { priceChanges: PriceChange[] }

export type ProcedureInput = Pick<
  Procedure,
  'code' | 'name' | 'description' | 'preparation' | 'priceCents' | 'durationMinutes' | 'categoryId' | 'active'
> & { prices: PriceVariant[] }

export type ProcedureStatus = 'ativos' | 'inativos' | 'todos'

const keys = {
  categories: ['procedure-categories'] as const,
  all: ['procedures'] as const,
  list: (params: object) => ['procedures', 'list', params] as const,
  detail: (id: string) => ['procedures', 'detail', id] as const,
}

const invalidateCatalog = () =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: keys.all }),
    queryClient.invalidateQueries({ queryKey: keys.categories }),
  ])

// ---------- Categorias ----------

export function useProcedureCategories() {
  return useQuery({
    queryKey: keys.categories,
    queryFn: () => api.get<ProcedureCategory[]>('/procedure-categories'),
    staleTime: 5 * 60_000,
  })
}

export function useSaveCategory() {
  return useMutation({
    mutationFn: ({ id, name }: { id?: string; name: string }) =>
      id
        ? api.put<ProcedureCategory>(`/procedure-categories/${id}`, { name })
        : api.post<ProcedureCategory>('/procedure-categories', { name }),
    onSuccess: invalidateCatalog,
  })
}

export function useDeleteCategory() {
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/procedure-categories/${id}`),
    onSuccess: invalidateCatalog,
  })
}

// ---------- Procedimentos ----------

export function useProcedures(params: { q?: string; categoryId?: string; status?: ProcedureStatus }) {
  return useQuery({
    queryKey: keys.list(params),
    // O catálogo inteiro cabe numa página: facilita agrupar por categoria e imprimir
    queryFn: () =>
      api.get<Paginated<Procedure>>(`/procedures${toQueryString({ ...params, pageSize: 500 })}`),
    placeholderData: keepPreviousData,
  })
}

export function useProcedure(id: string | undefined) {
  return useQuery({
    queryKey: keys.detail(id ?? ''),
    queryFn: () => api.get<ProcedureDetail>(`/procedures/${id}`),
    enabled: Boolean(id),
  })
}

export function useSaveProcedure() {
  return useMutation({
    mutationFn: ({ id, ...input }: ProcedureInput & { id?: string }) =>
      id ? api.put<Procedure>(`/procedures/${id}`, input) : api.post<Procedure>('/procedures', input),
    onSuccess: invalidateCatalog,
  })
}
