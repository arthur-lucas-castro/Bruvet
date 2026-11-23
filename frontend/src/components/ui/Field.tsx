import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'

const controlClass =
  'block w-full rounded-lg border border-border bg-card px-3 text-base text-foreground transition-colors duration-150 placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/20 disabled:bg-muted aria-invalid:border-destructive aria-invalid:focus:ring-destructive/20 sm:text-sm'

type FieldProps = {
  label: string
  error?: string
  hint?: ReactNode
  className?: string
  children: (props: { id: string; 'aria-invalid'?: true; 'aria-describedby'?: string }) => ReactNode
}

/** Rótulo + controle + dica/erro abaixo do campo, com os atributos de acessibilidade ligados. */
export function Field({ label, error, hint, className = '', children }: FieldProps) {
  const id = useId()
  const messageId = `${id}-msg`
  const hasMessage = Boolean(error || hint)

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': hasMessage ? messageId : undefined,
      })}
      {error ? (
        <p id={messageId} className="text-sm text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = '', ...props }, ref) {
    return <input ref={ref} className={`${controlClass} min-h-11 ${className}`} {...props} />
  },
)

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className = '', ...props }, ref) {
    return <select ref={ref} className={`${controlClass} min-h-11 ${className}`} {...props} />
  },
)

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className = '', rows = 3, ...props }, ref) {
    return <textarea ref={ref} rows={rows} className={`${controlClass} py-2.5 ${className}`} {...props} />
  },
)

type CheckboxProps = InputHTMLAttributes<HTMLInputElement> & { label: string; description?: string }

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, description, className = '', ...props },
  ref,
) {
  return (
    <label className={`flex min-h-11 cursor-pointer items-start gap-3 py-2 ${className}`}>
      <input
        ref={ref}
        type="checkbox"
        className="mt-0.5 size-5 shrink-0 cursor-pointer rounded border-border accent-primary"
        {...props}
      />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="block text-sm text-muted-foreground">{description}</span>}
      </span>
    </label>
  )
})
