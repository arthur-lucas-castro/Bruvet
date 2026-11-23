import { useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { formatInstantDate as formatDate, formatWeight } from '../../lib/format'
import type { WeightPoint } from './history-api'

const HEIGHT = 200
const MARGIN = { top: 16, right: 64, bottom: 28, left: 44 }
const SOURCE_LABELS = { cadastro: 'Cadastro', atendimento: 'Atendimento' } as const

/** Marcas "redondas" para o eixo Y (ex.: 28 / 29 / 30 / 31). */
function niceTicks(min: number, max: number, count = 4) {
  if (min === max) {
    const pad = Math.max(0.5, Math.abs(min) * 0.05)
    min -= pad
    max += pad
  }
  const raw = (max - min) / count
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? raw
  const start = Math.floor(min / step) * step
  const end = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let v = start; v <= end + step / 2; v += step) ticks.push(Math.round(v * 1000) / 1000)
  return ticks
}

const tickFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

/** Curva de peso do paciente: série única (sem legenda; o título nomeia), com tooltip e tabela. */
export function WeightChart({ points }: { points: WeightPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [active, setActive] = useState<number | null>(null)
  const [showTable, setShowTable] = useState(false)

  useLayoutEffect(() => {
    const element = containerRef.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(element)
    return () => observer.disconnect()
    // O contêiner é recriado ao voltar da tabela para o gráfico
  }, [showTable])

  const geometry = useMemo(() => {
    if (points.length === 0 || width === 0) return null
    const times = points.map((p) => new Date(p.recordedAt).getTime())
    const values = points.map((p) => p.weightKg)
    const ticks = niceTicks(Math.min(...values), Math.max(...values))
    const yMin = ticks[0]
    const yMax = ticks[ticks.length - 1]
    const tMin = Math.min(...times)
    const tMax = Math.max(...times)
    const plotW = Math.max(10, width - MARGIN.left - MARGIN.right)
    const plotH = HEIGHT - MARGIN.top - MARGIN.bottom

    const x = (t: number) => MARGIN.left + (tMax === tMin ? plotW / 2 : ((t - tMin) / (tMax - tMin)) * plotW)
    const y = (v: number) => MARGIN.top + (1 - (v - yMin) / (yMax - yMin)) * plotH
    const coords = points.map((p, i) => ({ x: x(times[i]), y: y(p.weightKg), point: p }))
    const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')
    return { coords, path, ticks, y, plotW }
  }, [points, width])

  if (points.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma pesagem registrada. O peso entra no histórico pelo cadastro e ao finalizar atendimentos.
      </p>
    )
  }

  const first = points[0]
  const last = points[points.length - 1]
  const delta = last.weightKg - first.weightKg
  const summary =
    points.length === 1
      ? `Uma pesagem: ${formatWeight(last.weightKg)} em ${formatDate(last.recordedAt)}.`
      : `${points.length} pesagens, de ${formatWeight(first.weightKg)} em ${formatDate(first.recordedAt)} a ${formatWeight(last.weightKg)} em ${formatDate(last.recordedAt)}.`

  // Hover: o ponto mais próximo na horizontal (alvo maior que o marcador)
  function onPointerMove(event: PointerEvent<SVGRectElement>) {
    if (!geometry) return
    const left = event.currentTarget.getBoundingClientRect().left
    const px = event.clientX - left + MARGIN.left
    let nearest = 0
    geometry.coords.forEach((c, i) => {
      if (Math.abs(c.x - px) < Math.abs(geometry.coords[nearest].x - px)) nearest = i
    })
    setActive(nearest)
  }

  function onKeyDown(event: KeyboardEvent<SVGRectElement>) {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault()
      const step = event.key === 'ArrowRight' ? 1 : -1
      setActive((i) => Math.min(points.length - 1, Math.max(0, (i ?? (step > 0 ? -1 : points.length)) + step)))
    } else if (event.key === 'Escape') {
      setActive(null)
    }
  }

  const activeCoord = active !== null && geometry ? geometry.coords[active] : null

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-sm text-muted-foreground">
          Atual: <span className="font-mono font-semibold text-foreground">{formatWeight(last.weightKg)}</span>
          {points.length > 1 && (
            <>
              {' '}
              · variação{' '}
              <span className="font-mono text-foreground">
                {delta > 0 ? '+' : delta < 0 ? '−' : ''}
                {formatWeight(Math.abs(delta))}
              </span>{' '}
              desde {formatDate(first.recordedAt)}
            </>
          )}
        </p>
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
        <WeightTable points={points} />
      ) : (
        <div ref={containerRef} className="relative w-full" style={{ height: HEIGHT }}>
          {geometry && (
            <svg width={width} height={HEIGHT} role="img" aria-label={`Curva de peso. ${summary}`} className="overflow-visible">
              {/* Grade horizontal recessiva + rótulos do eixo Y */}
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
                  <text
                    x={MARGIN.left - 8}
                    y={geometry.y(tick)}
                    textAnchor="end"
                    dominantBaseline="middle"
                    className="fill-muted-foreground font-mono text-[11px]"
                  >
                    {tickFormatter.format(tick)}
                  </text>
                </g>
              ))}

              {/* Datas: primeira e última pesagem */}
              <text x={geometry.coords[0].x} y={HEIGHT - 8} textAnchor={points.length === 1 ? 'middle' : 'start'} className="fill-muted-foreground font-mono text-[11px]">
                {formatDate(first.recordedAt)}
              </text>
              {points.length > 1 && (
                <text x={geometry.coords[geometry.coords.length - 1].x} y={HEIGHT - 8} textAnchor="end" className="fill-muted-foreground font-mono text-[11px]">
                  {formatDate(last.recordedAt)}
                </text>
              )}

              {/* Mira vertical do ponto em foco */}
              {activeCoord && (
                <line
                  x1={activeCoord.x}
                  x2={activeCoord.x}
                  y1={MARGIN.top}
                  y2={HEIGHT - MARGIN.bottom}
                  stroke="var(--color-muted-foreground)"
                  strokeWidth={1}
                  opacity={0.5}
                />
              )}

              <path
                d={geometry.path}
                fill="none"
                stroke="var(--color-chart-1)"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {/* Marcadores com anel na cor da superfície */}
              {geometry.coords.map((c, i) => (
                <circle
                  key={c.point.id}
                  cx={c.x}
                  cy={c.y}
                  r={active === i ? 6 : 4}
                  fill="var(--color-chart-1)"
                  stroke="var(--color-card)"
                  strokeWidth={2}
                />
              ))}

              {/* Rótulo direto só no último valor (texto na cor de texto, não na da série) */}
              <text
                x={geometry.coords[geometry.coords.length - 1].x + 10}
                y={geometry.coords[geometry.coords.length - 1].y}
                dominantBaseline="middle"
                className="fill-foreground font-mono text-xs font-semibold"
              >
                {formatWeight(last.weightKg)}
              </text>

              {/* Área de interação (maior que os marcadores) */}
              <rect
                x={MARGIN.left - 12}
                y={0}
                width={geometry.plotW + 24}
                height={HEIGHT}
                fill="transparent"
                tabIndex={0}
                aria-label="Explorar pesagens com as setas esquerda e direita"
                onPointerMove={onPointerMove}
                onPointerLeave={() => setActive(null)}
                onKeyDown={onKeyDown}
                onBlur={() => setActive(null)}
                className="cursor-crosshair outline-none focus-visible:outline-2 focus-visible:outline-ring"
              />
            </svg>
          )}

          {activeCoord && (
            <div
              role="status"
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md"
              style={{
                left: Math.min(Math.max(activeCoord.x, 70), width - 70),
                top: activeCoord.y - 12,
              }}
            >
              <p className="font-mono font-semibold text-foreground">{formatWeight(activeCoord.point.weightKg)}</p>
              <p className="whitespace-nowrap text-muted-foreground">
                {formatDate(activeCoord.point.recordedAt)} · {SOURCE_LABELS[activeCoord.point.source]}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function WeightTable({ points }: { points: WeightPoint[] }) {
  return (
    <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Pesagens do paciente</caption>
        <thead className="sticky top-0 bg-muted text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th scope="col" className="px-3 py-2 font-semibold">
              Data
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              Origem
            </th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">
              Peso
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {[...points].reverse().map((p) => (
            <tr key={p.id}>
              <td className="px-3 py-2 font-mono">{formatDate(p.recordedAt)}</td>
              <td className="px-3 py-2 text-muted-foreground">{SOURCE_LABELS[p.source]}</td>
              <td className="px-3 py-2 text-right font-mono">{formatWeight(p.weightKg)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
