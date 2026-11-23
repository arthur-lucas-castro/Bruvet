import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { ApiError } from './api'

export const ME_QUERY_KEY = ['auth', 'me'] as const

/** Reage a sessão expirada (401) e troca de senha pendente (403) em qualquer chamada. */
function handleAuthErrors(error: Error) {
  if (!(error instanceof ApiError)) return
  if (error.code === 'UNAUTHENTICATED') {
    queryClient.setQueryData(ME_QUERY_KEY, null)
  } else if (error.code === 'PASSWORD_CHANGE_REQUIRED') {
    void queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY })
  }
}

export const queryClient: QueryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleAuthErrors }),
  mutationCache: new MutationCache({ onError: handleAuthErrors }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Não insiste em erros do cliente (4xx); tenta de novo em falhas de rede/servidor.
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 2,
    },
  },
})
