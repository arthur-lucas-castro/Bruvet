export type Paginated<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
}

/** Monta a query string ignorando valores vazios. */
export function toQueryString(params: Record<string, string | number | undefined | null>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}
