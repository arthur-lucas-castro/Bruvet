import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { queryClient } from '../../lib/query-client'
import type { Role, User } from '../auth/auth-api'

const USERS_KEY = ['users'] as const

export type CreateUserInput = {
  name: string
  email: string
  role: Role
  crmv?: string | null
  password: string
}

export type UpdateUserInput = Partial<{
  name: string
  role: Role
  crmv: string | null
  active: boolean
}>

const invalidate = () => queryClient.invalidateQueries({ queryKey: USERS_KEY })

export function useUsers() {
  return useQuery({ queryKey: USERS_KEY, queryFn: () => api.get<User[]>('/users') })
}

export function useCreateUser() {
  return useMutation({
    mutationFn: (input: CreateUserInput) => api.post<User>('/users', input),
    onSuccess: invalidate,
  })
}

export function useUpdateUser() {
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateUserInput & { id: string }) =>
      api.patch<User>(`/users/${id}`, input),
    onSuccess: invalidate,
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      api.post<User>(`/users/${id}/reset-password`, { password }),
    onSuccess: invalidate,
  })
}
