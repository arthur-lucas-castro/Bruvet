import { Bird, Cat, Dog, PawPrint, Rabbit, Rat, Turtle, type LucideIcon } from 'lucide-react'

export const SPECIES = ['cao', 'gato', 'ave', 'roedor', 'coelho', 'reptil', 'outro'] as const
export type Species = (typeof SPECIES)[number]

export const SPECIES_LABELS: Record<Species, string> = {
  cao: 'Cão',
  gato: 'Gato',
  ave: 'Ave',
  roedor: 'Roedor',
  coelho: 'Coelho',
  reptil: 'Réptil',
  outro: 'Outro',
}

export const SPECIES_ICONS: Record<Species, LucideIcon> = {
  cao: Dog,
  gato: Cat,
  ave: Bird,
  roedor: Rat,
  coelho: Rabbit,
  reptil: Turtle,
  outro: PawPrint,
}

export const SEXES = ['macho', 'femea', 'indefinido'] as const
export type Sex = (typeof SEXES)[number]

export const SEX_LABELS: Record<Sex, string> = {
  macho: 'Macho',
  femea: 'Fêmea',
  indefinido: 'Não definido',
}

export const SIZES = ['pequeno', 'medio', 'grande'] as const
export type Size = (typeof SIZES)[number]

export const SIZE_LABELS: Record<Size, string> = {
  pequeno: 'Pequeno',
  medio: 'Médio',
  grande: 'Grande',
}

/** Rótulo de uma variação de preço: "Cão · Grande", "Gato", "Porte grande". */
export function variantLabel(species: Species | null, size: Size | null): string {
  if (species && size) return `${SPECIES_LABELS[species]} · ${SIZE_LABELS[size]}`
  if (species) return SPECIES_LABELS[species]
  if (size) return `Porte ${SIZE_LABELS[size].toLowerCase()}`
  return 'Valor padrão'
}

/** "Castrado"/"Castrada" conforme o sexo. */
export const neuteredLabel = (sex: Sex) => (sex === 'femea' ? 'Castrada' : 'Castrado')
