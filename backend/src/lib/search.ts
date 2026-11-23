/** Minúsculas e sem acentos, para comparar "João" com "joao". */
export function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Monta o texto indexado a partir dos campos pesquisáveis de um registro. */
export function buildSearchText(...parts: (string | null | undefined)[]): string {
  return normalizeSearch(parts.filter(Boolean).join(" "));
}

/** Divide a busca em palavras normalizadas: todas precisam aparecer no registro. */
export function searchTerms(query: string | undefined): string[] {
  if (!query) return [];
  return normalizeSearch(query).split(" ").filter(Boolean).slice(0, 8);
}
