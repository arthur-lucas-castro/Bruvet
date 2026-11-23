import { Link, type LinkProps } from 'react-router'

type ButtonLinkProps = LinkProps & { variant?: 'primary' | 'secondary' }

const variants = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover',
  secondary: 'border border-border bg-card text-foreground hover:bg-muted',
}

/** Link com aparência de botão, para ações que levam a outra página. */
export function ButtonLink({ variant = 'primary', className = '', ...props }: ButtonLinkProps) {
  return (
    <Link
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors duration-150 ${variants[variant]} ${className}`}
      {...props}
    />
  )
}
