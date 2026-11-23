import { SIZES, SPECIES } from "../patients/species.js";

export type PriceVariant = {
  species: string | null;
  size: string | null;
  priceCents: number;
};

/**
 * Preço de um procedimento para um paciente. Entre as variações que combinam com o
 * animal, vale a mais específica:
 *   1. espécie + porte   2. só espécie   3. só porte   4. valor padrão do procedimento
 */
export function resolvePrice(
  procedure: { priceCents: number; prices: PriceVariant[] },
  patient: { species: string; size: string | null },
): { priceCents: number; variant: PriceVariant | null } {
  let best: { score: number; variant: PriceVariant } | null = null;

  for (const variant of procedure.prices) {
    const speciesMatches = variant.species === null || variant.species === patient.species;
    const sizeMatches = variant.size === null || variant.size === patient.size;
    if (!speciesMatches || !sizeMatches) continue;

    // Espécie pesa mais que porte: "Cão" vence "Porte grande" para um cão grande
    const score = (variant.species ? 2 : 0) + (variant.size ? 1 : 0);
    if (!best || score > best.score) best = { score, variant };
  }

  return best
    ? { priceCents: best.variant.priceCents, variant: best.variant }
    : { priceCents: procedure.priceCents, variant: null };
}

/** Chave única de uma variação (espécie + porte). */
export const variantKey = (v: { species: string | null; size: string | null }) =>
  `${v.species ?? "*"}|${v.size ?? "*"}`;

/** Ordena as variações na ordem das listas de espécies e portes. */
export function sortVariants<T extends { species: string | null; size: string | null }>(variants: T[]) {
  const rank = (list: readonly string[], value: string | null) =>
    value === null ? -1 : list.indexOf(value);
  return [...variants].sort(
    (a, b) =>
      rank(SPECIES, a.species) - rank(SPECIES, b.species) || rank(SIZES, a.size) - rank(SIZES, b.size),
  );
}
