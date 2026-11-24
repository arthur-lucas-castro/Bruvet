import { TriangleAlert } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Field, Input, Select } from '../../components/ui/Field'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { ApiError } from '../../lib/api'
import { formatCurrency, formatInstantDate, localDayStartIso, todayInput } from '../../lib/format'
import { useListParams } from '../../lib/use-list-params'
import { formatAttendanceCode } from '../attendances/constants'
import { PAYMENT_LABELS, useSaveSettings, useSettings } from '../billing/billing-api'
import { SPECIES_LABELS } from '../patients/species'
import { useFinanceSummary, type FinanceRow } from './finance-api'
import { RevenueCostChart } from './RevenueCostChart'

const PRESETS = [
  ['mes', 'Este mês'],
  ['mes-anterior', 'Mês passado'],
  ['30d', 'Últimos 30 dias'],
  ['90d', 'Últimos 90 dias'],
  ['ano', 'Este ano'],
  ['personalizado', 'Personalizado'],
] as const
type Preset = (typeof PRESETS)[number][0]

const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** Período em dias do calendário local: [início, fim] inclusivos. */
function presetRange(preset: Preset, de: string, ate: string): { start: string; end: string } {
  const today = new Date()
  const y = today.getFullYear()
  const m = today.getMonth()
  switch (preset) {
    case 'mes-anterior':
      return { start: ymd(new Date(y, m - 1, 1)), end: ymd(new Date(y, m, 0)) }
    case '30d':
      return { start: ymd(new Date(y, m, today.getDate() - 29)), end: todayInput() }
    case '90d':
      return { start: ymd(new Date(y, m, today.getDate() - 89)), end: todayInput() }
    case 'ano':
      return { start: `${y}-01-01`, end: todayInput() }
    case 'personalizado':
      return { start: de || ymd(new Date(y, m, 1)), end: ate || todayInput() }
    default:
      return { start: ymd(new Date(y, m, 1)), end: todayInput() }
  }
}

const percent = (value: number | null) =>
  value === null ? '—' : `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`

export function FinancePage() {
  const { values, setFilters } = useListParams(['periodo', 'de', 'ate'] as const)
  const preset = (PRESETS.some(([p]) => p === values.periodo) ? values.periodo : 'mes') as Preset
  const { start, end } = presetRange(preset, values.de, values.ate)
  const invalidRange = start > end
  const { data, isPending, isError, isPlaceholderData } = useFinanceSummary({
    from: localDayStartIso(start),
    until: localDayStartIso(invalidRange ? start : end, 1),
  })

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <p className="text-sm text-muted-foreground">
          Lucro, custos e recebimentos para decisão. Receita e custos pela data do atendimento; recebimentos pela data
          do pagamento.
        </p>
        <div className="flex flex-wrap items-end gap-3 print:hidden">
          <Field label="Período" className="w-48">
            {(a11y) => (
              <Select {...a11y} value={preset} onChange={(e) => setFilters({ periodo: e.target.value === 'mes' ? '' : e.target.value })}>
                {PRESETS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          {preset === 'personalizado' && (
            <>
              <Field label="De" className="w-40">
                {(a11y) => <Input {...a11y} type="date" value={start} onChange={(e) => setFilters({ de: e.target.value })} />}
              </Field>
              <Field label="Até" className="w-40" error={invalidRange ? 'Antes do início' : undefined}>
                {(a11y) => <Input {...a11y} type="date" value={end} onChange={(e) => setFilters({ ate: e.target.value })} />}
              </Field>
            </>
          )}
        </div>
      </div>

      {isPending ? (
        <LoadingState label="Calculando indicadores..." />
      ) : isError ? (
        <ErrorState message="Não foi possível carregar o financeiro." />
      ) : (
        <div className={`space-y-5 ${isPlaceholderData ? 'opacity-60 transition-opacity' : ''}`}>
          {(data.dataQuality.proceduresWithoutCost > 0 || data.dataQuality.medicationsWithoutCost > 0 || data.stock.batchesWithoutCost > 0) && (
            <div role="note" className="flex items-start gap-3 rounded-xl border border-accent/40 bg-orange-50 px-4 py-3 text-sm text-orange-900">
              <TriangleAlert className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden="true" />
              <div>
                <p className="font-semibold">Custos incompletos: a margem real é menor que a mostrada.</p>
                <ul className="mt-1 list-disc pl-5">
                  {data.dataQuality.proceduresWithoutCost > 0 && (
                    <li>
                      {data.dataQuality.proceduresWithoutCost} procedimento(s) lançado(s) sem custo direto —{' '}
                      <Link to="/procedimentos" className="font-semibold underline">cadastre o custo no catálogo</Link>.
                    </li>
                  )}
                  {data.dataQuality.medicationsWithoutCost > 0 && (
                    <li>{data.dataQuality.medicationsWithoutCost} saída(s) de medicamento de lotes sem custo unitário.</li>
                  )}
                  {data.stock.batchesWithoutCost > 0 && (
                    <li>{data.stock.batchesWithoutCost} lote(s) em estoque sem custo unitário (fora do valor de estoque).</li>
                  )}
                </ul>
              </div>
            </div>
          )}

          <section aria-label="Indicadores" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Faturamento" value={formatCurrency(data.kpis.revenueCents)} hint={`${data.kpis.attendances} atendimentos`} />
            <Kpi label="Custo direto" value={formatCurrency(data.kpis.directCostCents)} hint={`Procedimentos ${formatCurrency(data.kpis.procedureCostCents)} · medicamentos ${formatCurrency(data.kpis.medicationCostCents)}`} />
            <Kpi label="Margem bruta" value={formatCurrency(data.kpis.grossMarginCents)} hint={percent(data.kpis.grossMarginPercent)} />
            <Kpi label="Ticket médio" value={formatCurrency(data.kpis.averageTicketCents)} hint="por atendimento" />
            <Kpi label="Recebido" value={formatCurrency(data.kpis.receivedCents)} hint="pagamentos no período" />
            <Kpi
              label="A receber"
              value={formatCurrency(data.kpis.receivableCents)}
              hint={
                data.kpis.receivableBills
                  ? `${data.kpis.receivableBills} comanda(s) · mais antiga ${formatInstantDate(data.kpis.oldestOpenBillAt!)}`
                  : 'nenhuma comanda em aberto'
              }
              to="/comandas"
            />
            <Kpi label="Descontos" value={formatCurrency(data.kpis.discountCents)} hint="concedidos no período" />
            <Kpi
              label="Perdas e uso interno"
              value={formatCurrency(data.kpis.lossCostCents + data.kpis.internalUseCostCents)}
              hint={`Perdas ${formatCurrency(data.kpis.lossCostCents)} · interno ${formatCurrency(data.kpis.internalUseCostCents)}`}
            />
            <Kpi
              label="Equipe (plantões)"
              value={formatCurrency(data.kpis.staffCostCents)}
              hint={`${data.staff.shifts} realizado(s) · veterinários ${formatCurrency(data.staff.veterinariansCents)} · enfermagem ${formatCurrency(data.staff.nursesCents)}${data.kpis.staffScheduledCents ? ` · previsto ${formatCurrency(data.kpis.staffScheduledCents)}` : ''}`}
              to="/escala?aba=pagamentos"
            />
            <Kpi
              label="Plantões a pagar"
              value={formatCurrency(data.kpis.staffPayableCents)}
              hint="realizados e não pagos, de qualquer data"
              to="/escala?aba=pagamentos"
            />
            <Kpi
              label="Resultado"
              value={formatCurrency(data.kpis.resultCents)}
              hint="margem bruta − plantões − perdas e uso interno"
            />
          </section>

          <Card title={`Receita × custo direto por ${data.period.granularity === 'mes' ? 'mês' : 'dia'}`}>
            <RevenueCostChart series={data.series} />
          </Card>

          <div className="grid items-start gap-5 xl:grid-cols-2">
            <Card title="Por categoria">
              <MarginTable rows={data.categories} empty="Sem receita no período." />
            </Card>
            <Card title="Procedimentos que mais faturam">
              <MarginTable rows={data.topProcedures} showCount empty="Nenhum procedimento lançado." />
            </Card>
            <Card title="Por veterinário">
              <MarginTable rows={data.veterinarians} showCount countLabel="Atend." empty="Sem atendimentos." />
            </Card>
            <Card title="Por espécie">
              <MarginTable
                rows={data.species.map((s) => ({ ...s, name: SPECIES_LABELS[s.id] ?? s.name }))}
                showCount
                countLabel="Atend."
                empty="Sem atendimentos."
              />
            </Card>
            <Card title="Recebido por forma de pagamento">
              {data.paymentMethods.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum pagamento no período.</p>
              ) : (
                <ul className="space-y-2.5 text-sm">
                  {data.paymentMethods.map((p) => {
                    const share = data.kpis.receivedCents ? (p.amountCents / data.kpis.receivedCents) * 100 : 0
                    return (
                      <li key={p.method}>
                        <p className="flex justify-between gap-3">
                          <span>{PAYMENT_LABELS[p.method] ?? p.method}</span>
                          <span className="font-mono">
                            {formatCurrency(p.amountCents)} <span className="text-muted-foreground">· {percent(share)}</span>
                          </span>
                        </p>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                          <div className="h-full rounded-full" style={{ width: `${share}%`, background: 'var(--color-chart-1)' }} />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Card>
            <Card title="Estoque (agora)">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Valor em estoque (lotes válidos, a custo)</dt>
                  <dd className="font-mono font-semibold">{formatCurrency(data.stock.valueCents)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Parado em lotes vencidos</dt>
                  <dd className={`font-mono ${data.stock.expiredValueCents ? 'text-destructive' : ''}`}>{formatCurrency(data.stock.expiredValueCents)}</dd>
                </div>
              </dl>
              <Link to="/estoque" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline">
                Ver estoque
              </Link>
            </Card>
          </div>

          <Card title="Descontos concedidos">
            {data.discounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum desconto no período.</p>
            ) : (
              <div className="-mx-5 -my-5 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-5 py-2.5 font-semibold">Atendimento</th>
                      <th scope="col" className="px-3 py-2.5 font-semibold">Motivo</th>
                      <th scope="col" className="hidden px-3 py-2.5 font-semibold sm:table-cell">Quem</th>
                      <th scope="col" className="px-5 py-2.5 text-right font-semibold">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.discounts.map((d) => (
                      <tr key={d.attendanceId}>
                        <td className="px-5 py-2.5">
                          <Link to={`/atendimentos/${d.attendanceId}`} className="hover:text-primary">
                            {d.patientName}
                          </Link>
                          <span className="block font-mono text-xs text-muted-foreground">{formatAttendanceCode(d.attendanceCode)}</span>
                        </td>
                        <td className="px-3 py-2.5">{d.reason ?? '—'}</td>
                        <td className="hidden px-3 py-2.5 sm:table-cell">{d.by ?? '—'}</td>
                        <td className="px-5 py-2.5 text-right font-mono">{formatCurrency(d.amountCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      <DiscountLimitCard />
    </div>
  )
}

function Kpi({ label, value, hint, to }: { label: string; value: string; hint?: ReactNode; to?: string }) {
  const body = (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-xl font-semibold">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </>
  )
  return to ? (
    <Link to={to} className="rounded-xl border border-border bg-card p-4 transition-colors duration-150 hover:border-primary">
      {body}
    </Link>
  ) : (
    <div className="rounded-xl border border-border bg-card p-4">{body}</div>
  )
}

function MarginTable({
  rows,
  showCount,
  countLabel = 'Qtd.',
  empty,
}: {
  rows: FinanceRow[]
  showCount?: boolean
  countLabel?: string
  empty: string
}) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>
  return (
    <div className="-mx-5 -my-5 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th scope="col" className="px-5 py-2.5 font-semibold">Item</th>
            {showCount && <th scope="col" className="px-3 py-2.5 text-right font-semibold">{countLabel}</th>}
            <th scope="col" className="px-3 py-2.5 text-right font-semibold">Receita</th>
            <th scope="col" className="hidden px-3 py-2.5 text-right font-semibold sm:table-cell">Custo</th>
            <th scope="col" className="px-5 py-2.5 text-right font-semibold">Margem</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="px-5 py-2.5">{r.name}</td>
              {showCount && <td className="px-3 py-2.5 text-right font-mono">{r.count}</td>}
              <td className={`px-3 py-2.5 text-right font-mono ${r.revenueCents < 0 ? 'text-destructive' : ''}`}>{formatCurrency(r.revenueCents)}</td>
              <td className="hidden px-3 py-2.5 text-right font-mono sm:table-cell">{formatCurrency(r.costCents)}</td>
              <td className={`px-5 py-2.5 text-right font-mono font-medium ${r.marginCents < 0 ? 'text-destructive' : ''}`}>{formatCurrency(r.marginCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Limite de desconto que veterinários e recepção podem aplicar sem o admin. */
function DiscountLimitCard() {
  const { data } = useSettings()
  const save = useSaveSettings()
  const [value, setValue] = useState<string | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const current = value ?? (data ? String(data.discountLimitPercent) : '')

  async function submit(event: FormEvent) {
    event.preventDefault()
    const n = Number(current)
    if (!Number.isInteger(n) || n < 0 || n > 100) return setMessage({ ok: false, text: 'Use um número inteiro de 0 a 100.' })
    try {
      await save.mutateAsync({ discountLimitPercent: n })
      setValue(null)
      setMessage({ ok: true, text: 'Limite salvo.' })
    } catch (err) {
      setMessage({ ok: false, text: err instanceof ApiError ? err.message : 'Não foi possível salvar.' })
    }
  }

  return (
    <Card title="Configuração de descontos" className="print:hidden">
      <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
        <Field label="Limite para veterinários e recepção (%)" className="w-72" hint="Acima disso, só um administrador concede.">
          {(a11y) => (
            <Input {...a11y} value={current} onChange={(e) => setValue(e.target.value)} inputMode="numeric" className="font-mono" />
          )}
        </Field>
        <Button type="submit" variant="secondary" loading={save.isPending}>
          Salvar
        </Button>
      </form>
      {message && (
        <div className="mt-3">
          <Alert variant={message.ok ? 'success' : 'error'}>{message.text}</Alert>
        </div>
      )}
    </Card>
  )
}
