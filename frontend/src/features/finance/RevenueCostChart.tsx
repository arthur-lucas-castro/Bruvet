import { useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { formatCurrency } from '../../lib/format'
import type { FinanceSummary } from './finance-api'

type Series = FinanceSummary['series']

const HEIGHT = 240
const MARGIN = { top: 12, right: 12, bottom: 28, left: 64 }
const BAR_MAX = 24
const GAP = 2

const compact = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 })
const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** "2026-11-05" → "05/11"; "2026-11" → "nov/26" */
function bucketLabel(key: string) {
  const [y, m, d] = key.split('-')
  return d ? `${d}/${m}` : `${months[Number(m) - 1]}/${y.slice(2)}`
}

function niceMax(value: number) {
  if (value <= 0) return 100
  const magnitude = 10 ** Math.floor(Math.log10(value))
  return ([1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= value) ?? value)
}

/** Colunas agrupadas: receita (teal) × custo direto (violeta) por dia ou mês. */
export function RevenueCostChart({ series }: { series: Series }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [active, setActive] = useState<number | null>(null)
  const [showTable, setShowTable] = useState(false)

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
    // O contêiner é recriado ao voltar da tabela para o gráfico
  }, [showTable])

  const geometry = useMemo(() => {
    if (!width || series.length === 0) return null
    const max = niceMax(Math.max(...series.flatMap((s) => [s.revenueCents, s.costCents])))
    const plotW = Math.max(10, width - MARGIN.left - MARGIN.right)
    const plotH = HEIGHT - MARGIN.top - MARGIN.bottom
    const band = plotW / series.length
    const bar = Math.max(2, Math.min(BAR_MAX, (band * 0.7 - GAP) / 2))
    const y = (v: number) => MARGIN.top + plotH - (v / max) * plotH
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max)
    const labelEvery = Math.max(1, Math.ceil(series.length / Math.max(1, Math.floor(plotW / 56))))
    return { band, bar, y, ticks, plotW, baseline: MARGIN.top + plotH, labelEvery }
  }, [series, width])

  if (series.length === 0) return <p className="text-sm text-muted-foreground">Sem movimento no período.</p>

  /** Coluna com topo arredondado (4px) e base reta, crescendo da linha de base. */
  const column = (x: number, top: number, base: number, w: number) => {
    const h = base - top
    if (h <= 0) return ''
    const r = Math.min(4, w / 2, h)
    return `M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${x + w - r} Q${x + w},${top} ${x + w},${top + r} V${base} Z`
  }

  function onKeyDown(event: KeyboardEvent<SVGRectElement>) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    const step = event.key === 'ArrowRight' ? 1 : -1
    setActive((i) => Math.min(series.length - 1, Math.max(0, (i ?? (step > 0 ? -1 : series.length)) + step)))
  }

  const activeItem = active !== null ? series[active] : null

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap gap-4 text-sm" aria-label="Legenda">
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="size-3 rounded-sm" style={{ background: 'var(--color-chart-1)' }} />
            Receita
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="size-3 rounded-sm" style={{ background: 'var(--color-chart-2)' }} />
            Custo direto
          </li>
        </ul>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          aria-expanded={showTable}
          className="min-h-11 text-sm font-semibold text-primary hover:underline print:hidden"
        >
          {showTable ? 'Ver gráfico' : 'Ver como tabela'}
        </button>
      </div>

      {showTable ? (
        <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Receita e custo por período</caption>
            <thead className="sticky top-0 bg-muted text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">Período</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Receita</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Custo</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Recebido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {series.map((s) => (
                <tr key={s.key}>
                  <td className="px-3 py-2 font-mono">{bucketLabel(s.key)}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatCurrency(s.revenueCents)}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatCurrency(s.costCents)}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatCurrency(s.receivedCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={containerRef} className="relative w-full" style={{ height: HEIGHT }}>
          {geometry && (
            <svg width={width} height={HEIGHT} role="img" aria-label="Receita e custo direto por período" className="overflow-visible">
              {geometry.ticks.map((tick) => (
                <g key={tick}>
                  <line
                    x1={MARGIN.left}
                    x2={MARGIN.left + geometry.plotW}
                    y1={geometry.y(tick)}
                    y2={geometry.y(tick)}
                    stroke="var(--color-chart-grid)"
                    strokeWidth={1}
                  />
                  <text x={MARGIN.left - 8} y={geometry.y(tick)} textAnchor="end" dominantBaseline="middle" className="fill-muted-foreground font-mono text-[11px]">
                    {compact.format(tick / 100)}
                  </text>
                </g>
              ))}

              {series.map((s, i) => {
                const center = MARGIN.left + geometry.band * i + geometry.band / 2
                const x1 = center - geometry.bar - GAP / 2
                const x2 = center + GAP / 2
                const dim = active !== null && active !== i
                return (
                  <g key={s.key} opacity={dim ? 0.45 : 1}>
                    <path d={column(x1, geometry.y(s.revenueCents), geometry.baseline, geometry.bar)} fill="var(--color-chart-1)" />
                    <path d={column(x2, geometry.y(s.costCents), geometry.baseline, geometry.bar)} fill="var(--color-chart-2)" />
                    {i % geometry.labelEvery === 0 && (
                      <text x={center} y={HEIGHT - 8} textAnchor="middle" className="fill-muted-foreground font-mono text-[11px]">
                        {bucketLabel(s.key)}
                      </text>
                    )}
                    {/* Alvo de hover maior que as colunas: a faixa inteira do período */}
                    <rect
                      x={MARGIN.left + geometry.band * i}
                      y={MARGIN.top}
                      width={geometry.band}
                      height={geometry.baseline - MARGIN.top}
                      fill="transparent"
                      onPointerEnter={() => setActive(i)}
                      onPointerLeave={() => setActive(null)}
                    />
                  </g>
                )
              })}

              <line x1={MARGIN.left} x2={MARGIN.left + geometry.plotW} y1={geometry.baseline} y2={geometry.baseline} stroke="var(--color-border)" strokeWidth={1} />

              {/* Navegação por teclado (setas) */}
              <rect
                x={MARGIN.left}
                y={0}
                width={geometry.plotW}
                height={4}
                fill="transparent"
                tabIndex={0}
                aria-label="Explorar períodos com as setas esquerda e direita"
                onKeyDown={onKeyDown}
                onBlur={() => setActive(null)}
                className="outline-none focus-visible:outline-2 focus-visible:outline-ring"
              />
            </svg>
          )}

          {activeItem && geometry && (
            <div
              role="status"
              className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md"
              style={{
                left: Math.min(Math.max(MARGIN.left + geometry.band * active! + geometry.band / 2, 90), width - 90),
              }}
            >
              <p className="font-semibold text-foreground">{bucketLabel(activeItem.key)}</p>
              <p className="flex items-center gap-1.5">
                <span aria-hidden="true" className="size-2 rounded-sm" style={{ background: 'var(--color-chart-1)' }} />
                Receita <span className="ml-auto pl-3 font-mono">{formatCurrency(activeItem.revenueCents)}</span>
              </p>
              <p className="flex items-center gap-1.5">
                <span aria-hidden="true" className="size-2 rounded-sm" style={{ background: 'var(--color-chart-2)' }} />
                Custo <span className="ml-auto pl-3 font-mono">{formatCurrency(activeItem.costCents)}</span>
              </p>
              <p className="text-muted-foreground">
                Margem <span className="font-mono">{formatCurrency(activeItem.revenueCents - activeItem.costCents)}</span> · recebido{' '}
                <span className="font-mono">{formatCurrency(activeItem.receivedCents)}</span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
