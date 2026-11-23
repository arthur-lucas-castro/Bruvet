import type { ReactNode } from 'react'

type CardProps = {
  title?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}

/** Bloco branco com título opcional, usado para agrupar informações e formulários. */
export function Card({ title, actions, children, className = '' }: CardProps) {
  return (
    <section className={`rounded-xl border border-border bg-card ${className}`}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
          {title && <h2 className="font-semibold">{title}</h2>}
          {actions}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  )
}

type InfoListProps = {
  items: { label: string; value: ReactNode }[]
}

/** Lista de pares rótulo/valor; valores vazios aparecem como "—". */
export function InfoList({ items }: InfoListProps) {
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {items.map(({ label, value }) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </dt>
          <dd className="mt-0.5 break-words text-sm">
            {value || value === 0 ? value : <span className="text-muted-foreground">—</span>}
          </dd>
        </div>
      ))}
    </dl>
  )
}
