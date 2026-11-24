import { useState, type FormEvent } from 'react'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { Field, Input, Select, Textarea } from '../../components/ui/Field'
import { ApiError } from '../../lib/api'
import { centsToInput, formatCurrency, inputToCents } from '../../lib/format'
import { PAYMENT_LABELS, PAYMENT_METHODS, type PaymentMethod } from './billing-api'

const errorText = (error: unknown) =>
  error instanceof ApiError
    ? (Object.values(error.issues ?? {})[0]?.[0] ?? error.message)
    : 'Não foi possível concluir. Tente novamente.'

const footer = (onCancel: () => void, label: string, loading: boolean, variant: 'primary' | 'danger' = 'primary') => (
  <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
    <Button variant="secondary" onClick={onCancel}>
      Cancelar
    </Button>
    <Button type="submit" variant={variant} loading={loading}>
      {label}
    </Button>
  </div>
)

// ---------- Desconto ----------

type DiscountDialogProps = {
  open: boolean
  onClose: () => void
  subtotalCents: number
  currentCents: number
  currentReason: string | null
  /** null = sem limite (admin) */
  limitPercent: number | null
  onSubmit: (input: { amountCents: number; reason: string | null }) => Promise<unknown>
}

export function DiscountDialog(props: DiscountDialogProps) {
  return (
    <Dialog open={props.open} onClose={props.onClose} title="Desconto na comanda">
      <DiscountForm {...props} />
    </Dialog>
  )
}

function DiscountForm({ onClose, subtotalCents, currentCents, currentReason, limitPercent, onSubmit }: DiscountDialogProps) {
  const [mode, setMode] = useState<'valor' | 'percentual'>('valor')
  const [value, setValue] = useState(currentCents ? centsToInput(currentCents) : '')
  const [reason, setReason] = useState(currentReason ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const typed = inputToCents(value)
  const amountCents =
    typed === null || !Number.isFinite(typed)
      ? null
      : mode === 'valor'
        ? typed
        : Math.round((subtotalCents * typed) / 100 / 100) // typed vem em centavos do número digitado
  const limitCents = limitPercent === null ? null : Math.floor((subtotalCents * limitPercent) / 100)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (amountCents === null || amountCents < 0) return setError('Informe o desconto.')
    if (amountCents > subtotalCents) return setError('O desconto não pode ser maior que o subtotal.')
    if (amountCents > 0 && !reason.trim()) return setError('Informe o motivo do desconto.')
    setPending(true)
    try {
      await onSubmit({ amountCents, reason: reason.trim() || null })
      onClose()
    } catch (err) {
      setError(errorText(err))
    } finally {
      setPending(false)
    }
  }

  async function remove() {
    setPending(true)
    setError(null)
    try {
      await onSubmit({ amountCents: 0, reason: null })
      onClose()
    } catch (err) {
      setError(errorText(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <Alert>{error}</Alert>}
      <p className="text-sm text-muted-foreground">
        Subtotal: <span className="font-mono font-semibold text-foreground">{formatCurrency(subtotalCents)}</span>
        {limitCents !== null && (
          <>
            {' '}
            · seu limite: {limitPercent}% (<span className="font-mono">{formatCurrency(limitCents)}</span>). Acima disso,
            só um administrador.
          </>
        )}
      </p>

      <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
        <Field label="Tipo">
          {(a11y) => (
            <Select {...a11y} value={mode} onChange={(e) => setMode(e.target.value as 'valor' | 'percentual')}>
              <option value="valor">Valor (R$)</option>
              <option value="percentual">Percentual (%)</option>
            </Select>
          )}
        </Field>
        <Field
          label={mode === 'valor' ? 'Desconto em R$' : 'Desconto em %'}
          hint={amountCents !== null && mode === 'percentual' ? `= ${formatCurrency(amountCents)}` : undefined}
        >
          {(a11y) => (
            <Input {...a11y} value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" className="font-mono" autoFocus />
          )}
        </Field>
      </div>

      <Field label="Motivo" hint="Fica registrado com seu nome para o administrador.">
        {(a11y) => <Textarea {...a11y} value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />}
      </Field>

      {currentCents > 0 && (
        <Button variant="ghost" onClick={remove} disabled={pending}>
          Remover desconto atual
        </Button>
      )}
      {footer(onClose, 'Aplicar desconto', pending)}
    </form>
  )
}

// ---------- Pagamento ----------

type PaymentDialogProps = {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  balanceCents: number
  /** false = valor fixo no saldo (quitação de várias comandas) */
  allowPartial: boolean
  onSubmit: (input: {
    amountCents: number
    method: PaymentMethod
    installments: number | null
    notes: string | null
  }) => Promise<unknown>
}

export function PaymentDialog(props: PaymentDialogProps) {
  return (
    <Dialog open={props.open} onClose={props.onClose} title={props.title} description={props.description}>
      <PaymentForm {...props} />
    </Dialog>
  )
}

function PaymentForm({ onClose, balanceCents, allowPartial, onSubmit }: PaymentDialogProps) {
  const [amount, setAmount] = useState(centsToInput(balanceCents))
  const [method, setMethod] = useState<PaymentMethod>('pix')
  const [installments, setInstallments] = useState('1')
  const [received, setReceived] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const amountCents = allowPartial ? inputToCents(amount) : balanceCents
  const receivedCents = inputToCents(received)
  const change =
    method === 'dinheiro' && amountCents && receivedCents && Number.isFinite(receivedCents) ? receivedCents - amountCents : null

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (amountCents === null || !Number.isFinite(amountCents) || amountCents <= 0) return setError('Informe o valor.')
    if (amountCents > balanceCents) return setError(`O valor passa do saldo (${formatCurrency(balanceCents)}).`)
    setPending(true)
    try {
      await onSubmit({
        amountCents,
        method,
        installments: method === 'credito' ? Number(installments) : null,
        notes: notes.trim() || null,
      })
      onClose()
    } catch (err) {
      setError(errorText(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <Alert>{error}</Alert>}

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Forma de pagamento</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PAYMENT_METHODS.map((m) => (
            <label
              key={m}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 text-sm has-checked:border-primary has-checked:bg-primary/5"
            >
              <input type="radio" name="method" value={m} checked={method === m} onChange={() => setMethod(m)} className="accent-primary" />
              {PAYMENT_LABELS[m]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Valor (R$)"
          hint={allowPartial ? `Saldo: ${formatCurrency(balanceCents)}. Pode ser parcial.` : 'Quita o saldo das comandas selecionadas.'}
        >
          {(a11y) => (
            <Input
              {...a11y}
              value={allowPartial ? amount : centsToInput(balanceCents)}
              onChange={(e) => setAmount(e.target.value)}
              readOnly={!allowPartial}
              inputMode="decimal"
              className={`font-mono ${allowPartial ? '' : 'bg-muted'}`}
              autoFocus={allowPartial}
            />
          )}
        </Field>
        {method === 'credito' && (
          <Field label="Parcelas">
            {(a11y) => (
              <Select {...a11y} value={installments} onChange={(e) => setInstallments(e.target.value)}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n === 1 ? 'À vista' : `${n}x`}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
        {method === 'dinheiro' && (
          <Field
            label="Valor recebido (opcional)"
            hint={change !== null ? (change >= 0 ? `Troco: ${formatCurrency(change)}` : 'Valor recebido menor que o pagamento') : 'Para calcular o troco.'}
          >
            {(a11y) => <Input {...a11y} value={received} onChange={(e) => setReceived(e.target.value)} inputMode="decimal" className="font-mono" />}
          </Field>
        )}
      </div>

      <Field label="Observação (opcional)">
        {(a11y) => <Input {...a11y} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: NSU da maquininha" />}
      </Field>

      {footer(onClose, 'Registrar pagamento', pending)}
    </form>
  )
}

// ---------- Estorno de pagamento ----------

export function VoidPaymentDialog({
  open,
  onClose,
  description,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  description: string
  onSubmit: (reason: string) => Promise<unknown>
}) {
  return (
    <Dialog open={open} onClose={onClose} title="Estornar pagamento" description={description}>
      <VoidForm onClose={onClose} onSubmit={onSubmit} />
    </Dialog>
  )
}

function VoidForm({ onClose, onSubmit }: { onClose: () => void; onSubmit: (reason: string) => Promise<unknown> }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (reason.trim().length < 3) return setError('Informe o motivo.')
    setPending(true)
    setError(null)
    try {
      await onSubmit(reason.trim())
      onClose()
    } catch (err) {
      setError(errorText(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <Alert>{error}</Alert>}
      <Field label="Motivo do estorno" hint="O pagamento continua no histórico, marcado como estornado.">
        {(a11y) => <Textarea {...a11y} value={reason} onChange={(e) => setReason(e.target.value)} rows={2} autoFocus />}
      </Field>
      {footer(onClose, 'Estornar', pending, 'danger')}
    </form>
  )
}
