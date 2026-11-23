import { LoaderCircle, SearchX, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function LoadingState({ label = 'Carregando...' }: { label?: string }) {
  return (
    <div className="flex justify-center py-12" role="status">
      <LoaderCircle className="size-6 animate-spin text-primary" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  )
}

export function ErrorState({ message = 'Não foi possível carregar os dados.' }: { message?: string }) {
  return (
    <p role="alert" className="px-5 py-12 text-center text-sm text-destructive">
      {message}
    </p>
  )
}

type EmptyStateProps = {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon: Icon = SearchX, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <Icon className="size-9 text-muted-foreground" aria-hidden="true" />
      <p className="mt-3 font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
