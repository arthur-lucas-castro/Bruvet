import { CircleAlert, CircleCheck } from 'lucide-react'
import type { ReactNode } from 'react'

type AlertProps = {
  variant?: 'error' | 'success' | 'info'
  children: ReactNode
}

const styles = {
  error: 'border-destructive/30 bg-red-50 text-red-800',
  success: 'border-success/30 bg-green-50 text-green-800',
  info: 'border-primary/30 bg-muted text-foreground',
}

export function Alert({ variant = 'error', children }: AlertProps) {
  const Icon = variant === 'success' ? CircleCheck : CircleAlert
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm ${styles[variant]}`}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  )
}
