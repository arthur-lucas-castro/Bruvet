/** Unidades de controle do estoque. O saldo e as movimentações usam sempre esta unidade. */
export const UNITS = [
  "unidade",
  "comprimido",
  "capsula",
  "ml",
  "g",
  "frasco",
  "ampola",
  "dose",
  "bisnaga",
  "sache",
] as const;
export type Unit = (typeof UNITS)[number];

export const MOVEMENT_TYPES = ["entrada", "saida", "ajuste", "perda", "estorno"] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

/** Lotes que vencem dentro deste prazo entram no alerta de vencimento. */
export const EXPIRY_WARNING_DAYS = 60;

/** Quantidades aceitam até 3 casas decimais (ex.: 0,25 comprimido, 1,5 mL). */
export const roundQuantity = (value: number) => Math.round(value * 1000) / 1000;
