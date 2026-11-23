import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

type PageHeaderProps = {
  title: ReactNode
  subtitle?: ReactNode
  backTo?: { to: string; label: string }
  actions?: ReactNode
}

/** Cabeçalho de página com link de voltar, título e ações à direita. */
export function PageHeader({ title, subtitle, backTo, actions }: PageHeaderProps) {
  return (
    <div className="space-y-3">
      {backTo && (
        <Link
          to={backTo.to}
          className="-ml-1 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {backTo.label}
        </Link>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight [overflow-wrap:anywhere]">{title}</h2>
          {subtitle && <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  )
}
