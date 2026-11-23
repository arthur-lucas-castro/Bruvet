/** Formatação e máscaras dos dados exibidos no sistema (padrão brasileiro). */

export const onlyDigits = (value: string) => value.replace(/\D/g, '')

export function formatCpf(value: string | null | undefined): string {
  const d = onlyDigits(value ?? '').slice(0, 11)
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2')
}

export function formatPhone(value: string | null | undefined): string {
  const d = onlyDigits(value ?? '').slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export function formatCep(value: string | null | undefined): string {
  const d = onlyDigits(value ?? '').slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

/** Datas "somente dia" vêm da API como meia-noite UTC: formatar em UTC evita mostrar o dia anterior. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(iso))
}

const localDate = new Intl.DateTimeFormat('pt-BR')
const localDateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

/** Data de um instante (com hora), no fuso de quem está usando — ex.: data de um atendimento. */
export const formatInstantDate = (iso: string) => localDate.format(new Date(iso))
export const formatInstantDateTime = (iso: string) => localDateTime.format(new Date(iso))

/** "AAAA-MM-DD" do calendário local → instante ISO da meia-noite local daquele dia. */
export function localDayStartIso(day: string, addDays = 0): string {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d + addDays).toISOString()
}

/** "2020-05-10T00:00:00.000Z" → "2020-05-10" (valor de <input type="date">). */
export const toDateInput = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : '')

export const todayInput = () => {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

const plural = (n: number, singular: string, pluralForm: string) =>
  `${n} ${n === 1 ? singular : pluralForm}`

/** Idade a partir da data de nascimento, ex.: "3 anos e 2 meses", "5 meses", "12 dias". */
export function formatAge(birthIso: string | null, untilIso?: string | null): string {
  if (!birthIso) return ''
  const birth = new Date(birthIso)
  const until = untilIso ? new Date(untilIso) : new Date()

  let months =
    (until.getUTCFullYear() - birth.getUTCFullYear()) * 12 +
    (until.getUTCMonth() - birth.getUTCMonth())
  if (until.getUTCDate() < birth.getUTCDate()) months--

  if (months < 1) {
    const days = Math.max(0, Math.floor((until.getTime() - birth.getTime()) / 86_400_000))
    return plural(days, 'dia', 'dias')
  }

  const years = Math.floor(months / 12)
  const rest = months % 12
  if (years === 0) return plural(rest, 'mês', 'meses')
  if (rest === 0) return plural(years, 'ano', 'anos')
  return `${plural(years, 'ano', 'anos')} e ${plural(rest, 'mês', 'meses')}`
}

export function formatWeight(kg: number | null | undefined): string {
  if (kg == null) return ''
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(kg)} kg`
}

/** "12,5", "12.5" ou "1.250,5" → número; vazio → null; inválido → NaN. */
export function parseDecimal(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  // Com vírgula, o ponto é separador de milhar; sem vírgula, o ponto é o decimal
  const normalized = trimmed.includes(',')
    ? trimmed.replace(/\./g, '').replace(',', '.')
    : trimmed
  const number = Number(normalized)
  return Number.isFinite(number) ? number : NaN
}

export const formatRecordCode = (code: number) => String(code).padStart(4, '0')

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** 15000 → "R$ 150,00" */
export const formatCurrency = (cents: number) => currencyFormatter.format(cents / 100)

/** 15000 → "150,00" (valor de um campo de preço) */
export const centsToInput = (cents: number | null | undefined) =>
  cents == null
    ? ''
    : new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
        cents / 100,
      )

/** "150", "150,5" ou "1.500,00" → centavos; vazio → null; inválido → NaN. */
export function inputToCents(value: string): number | null {
  const number = parseDecimal(value.replace(/^R\$\s*/, ''))
  if (number === null) return null
  return Number.isFinite(number) ? Math.round(number * 100) : NaN
}

/** 90 → "1h30", 45 → "45 min" */
export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes) return ''
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours}h${String(rest).padStart(2, '0')}` : `${hours}h`
}
