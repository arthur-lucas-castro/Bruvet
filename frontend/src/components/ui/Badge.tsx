import type { ReactNode } from 'react'

type BadgeProps = {
  tone?: 'primary' | 'neutral' | 'warning' | 'danger'
  children: ReactNode
}

const tones = {
  primary: 'bg-primary/10 text-primary',
  neutral: 'bg-muted text-muted-foreground',
  warning: 'bg-orange-100 text-orange-800',
  danger: 'bg-red-100 text-red-800',
}

export function Badge({ tone = 'neutral', children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  )
}
