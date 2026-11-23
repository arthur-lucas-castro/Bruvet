import { useMutation, useQuery } from '@tanstack/react-query'
import { ApiError, api } from '../../lib/api'
import { ME_QUERY_KEY, queryClient } from '../../lib/query-client'

export const ROLES = ['admin', 'veterinario', 'recepcao'] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador',
  veterinario: 'Veterinário',
  recepcao: 'Recepção',
}

export type User = {
  id: string
  name: string
  email: string
  role: Role
  crmv: string | null
  active: boolean
  mustChangePassword: boolean
  createdAt: string
  updatedAt: string
}

/** Usuário logado; `null` quando não há sessão. */
export function useCurrentUser() {
  return useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: async () => {
      try {
        return await api.get<User>('/auth/me')
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null
        throw error
      }
    },
    staleTime: 5 * 60_000,
  })
}

/** Usuário logado em telas que já estão protegidas pelo RequireAuth. */
export function useAuthenticatedUser(): User {
  const { data } = useCurrentUser()
  if (!data) throw new Error('useAuthenticatedUser usado fora de uma rota protegida')
  return data
}

export function useLogin() {
  return useMutation({
    mutationFn: (input: { email: string; password: string }) => api.post<User>('/auth/login', input),
    onSuccess: (user) => queryClient.setQueryData(ME_QUERY_KEY, user),
  })
}

export function useLogout() {
  return useMutation({
    mutationFn: () => api.post<void>('/auth/logout'),
    onSettled: () => {
      queryClient.clear()
      queryClient.setQueryData(ME_QUERY_KEY, null)
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      api.post<User>('/auth/password', input),
    onSuccess: (user) => queryClient.setQueryData(ME_QUERY_KEY, user),
  })
}
