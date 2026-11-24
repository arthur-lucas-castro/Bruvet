/** "AAAA-MM" do mês atual no calendário local */
export function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/** Mês "AAAA-MM" → período do 1º dia (00:00 local) ao 1º dia do mês seguinte */
export function monthRange(month: string) {
  const [y, m] = month.split('-').map(Number)
  return { from: new Date(y, m - 1, 1).toISOString(), until: new Date(y, m, 1).toISOString() }
}

const monthFormat = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
export const formatMonth = (month: string) => {
  const [y, m] = month.split('-').map(Number)
  return monthFormat.format(new Date(y, m - 1, 1))
}
