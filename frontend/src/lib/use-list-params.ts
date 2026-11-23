import { useSearchParams } from 'react-router'

/**
 * Filtros e página de uma listagem guardados na URL, para que a busca sobreviva
 * ao recarregar a página, ao botão voltar e possa ser compartilhada por link.
 */
export function useListParams<K extends string>(keys: readonly K[]) {
  const [searchParams, setSearchParams] = useSearchParams()

  const values = Object.fromEntries(keys.map((key) => [key, searchParams.get(key) ?? ''])) as Record<
    K,
    string
  >
  const page = Math.max(1, Number(searchParams.get('page')) || 1)

  /** Atualiza um ou mais filtros de uma vez e volta para a primeira página. */
  function setFilters(changes: Partial<Record<K, string>>) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(changes) as [K, string][]) {
          if (value) next.set(key, value)
          else next.delete(key)
        }
        next.delete('page')
        return next
      },
      { replace: true },
    )
  }

  const setFilter = (key: K, value: string) => setFilters({ [key]: value } as Partial<Record<K, string>>)

  function setPage(value: number) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value > 1) next.set('page', String(value))
      else next.delete('page')
      return next
    })
  }

  return { values, page, setFilter, setFilters, setPage }
}
