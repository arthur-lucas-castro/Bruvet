export const SPECIES = ["cao", "gato", "ave", "roedor", "coelho", "reptil", "outro"] as const;
export type Species = (typeof SPECIES)[number];

export const SEXES = ["macho", "femea", "indefinido"] as const;
export type Sex = (typeof SEXES)[number];

/** Porte do animal, usado nas variações de preço dos procedimentos. */
export const SIZES = ["pequeno", "medio", "grande"] as const;
export type Size = (typeof SIZES)[number];
