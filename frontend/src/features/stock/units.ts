export const UNITS = [
  'unidade',
  'comprimido',
  'capsula',
  'ml',
  'g',
  'frasco',
  'ampola',
  'dose',
  'bisnaga',
  'sache',
] as const
export type Unit = (typeof UNITS)[number]

/** Nome da unidade no singular e no plural (para "1 comprimido" / "12 comprimidos"). */
export const UNIT_LABELS: Record<Unit, { one: string; many: string }> = {
  unidade: { one: 'unidade', many: 'unidades' },
  comprimido: { one: 'comprimido', many: 'comprimidos' },
  capsula: { one: 'cápsula', many: 'cápsulas' },
  ml: { one: 'mL', many: 'mL' },
  g: { one: 'g', many: 'g' },
  frasco: { one: 'frasco', many: 'frascos' },
  ampola: { one: 'ampola', many: 'ampolas' },
  dose: { one: 'dose', many: 'doses' },
  bisnaga: { one: 'bisnaga', many: 'bisnagas' },
  sache: { one: 'sachê', many: 'sachês' },
}

const numberFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 })

export const formatNumber = (value: number) => numberFormatter.format(value)

/** 12 + "comprimido" → "12 comprimidos"; 1,5 + "ml" → "1,5 mL" */
export function formatQuantity(value: number, unit: Unit): string {
  const label = Math.abs(value) === 1 ? UNIT_LABELS[unit].one : UNIT_LABELS[unit].many
  return `${formatNumber(value)} ${label}`
}

export const MOVEMENT_LABELS = {
  entrada: 'Entrada',
  saida: 'Saída',
  ajuste: 'Ajuste de inventário',
  perda: 'Perda / descarte',
  estorno: 'Estorno de saída',
} as const
export type MovementType = keyof typeof MOVEMENT_LABELS

export const EXPIRY_WARNING_DAYS = 60
