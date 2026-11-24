import { useMemo, useState, type FormEvent } from 'react'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { Checkbox, Field, Input, Select, Textarea } from '../../components/ui/Field'
import { ApiError } from '../../lib/api'
import { centsToInput, formatCurrency, formatInstantDateTime, inputToCents } from '../../lib/format'
import { ROLE_LABELS } from '../auth/auth-api'
import {
  SHIFT_KINDS,
  SHIFT_KIND_HOURS,
  SHIFT_KIND_LABELS,
  addDays,
  dayInput,
  slotFor,
  useCreateShifts,
  useDeleteShift,
  useUnpayShifts,
  useUpdateShift,
  type Shift,
  type ShiftKind,
  type StaffMember,
} from './shifts-api'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MAX_SLOTS = 62

const errorText = (error: unknown) =>
  error instanceof ApiError
    ? (Object.values(error.issues ?? {})[0]?.[0] ?? error.message)
    : 'Não foi possível concluir. Tente novamente.'

type Props = {
  open: boolean
  onClose: () => void
  staff: StaffMember[]
  /** Plantão a editar; ausente = novo */
  shift?: Shift | null
  /** Dia sugerido para um plantão novo (AAAA-MM-DD) */
  defaultDay?: string
}

export function ShiftFormDialog(props: Props) {
  return (
    <Dialog open={props.open} onClose={props.onClose} title={props.shift ? 'Editar plantão' : 'Novo plantão'}>
      <ShiftForm {...props} />
    </Dialog>
  )
}

const timeOf = (iso: string) => {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function ShiftForm({ onClose, staff, shift, defaultDay }: Props) {
  const isEdit = Boolean(shift)
  const paid = Boolean(shift?.paidAt)
  const create = useCreateShifts()
  const update = useUpdateShift()
  const remove = useDeleteShift()
  const unpay = useUnpayShifts()

  const [userId, setUserId] = useState(shift?.user.id ?? '')
  const [kind, setKind] = useState<ShiftKind>(shift?.kind ?? 'diurno')
  const [day, setDay] = useState(() =>
    shift ? dayInput(new Date(shift.startsAt)) : (defaultDay ?? dayInput(new Date())),
  )
  const [start, setStart] = useState(shift ? timeOf(shift.startsAt) : SHIFT_KIND_HOURS.diurno.start)
  const [end, setEnd] = useState(shift ? timeOf(shift.endsAt) : SHIFT_KIND_HOURS.diurno.end)
  const [amount, setAmount] = useState(shift?.amountCents != null ? centsToInput(shift.amountCents) : '')
  const [amountTouched, setAmountTouched] = useState(isEdit)
  const [notes, setNotes] = useState(shift?.notes ?? '')
  const [repeat, setRepeat] = useState(false)
  const [weekdays, setWeekdays] = useState<number[]>(() => [new Date(`${day}T12:00`).getDay()])
  const [repeatUntil, setRepeatUntil] = useState(() => dayInput(addDays(new Date(`${day}T12:00`), 27)))
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Fora da lista (ex.: profissional desativado) ainda aparece na edição
  const options = useMemo(() => {
    if (!shift || staff.some((s) => s.id === shift.user.id)) return staff
    return [...staff, { ...shift.user, rates: null }]
  }, [staff, shift])
  const member = options.find((s) => s.id === userId)
  const rateCents = member?.rates?.[kind] ?? null

  /** Valor sugerido = valor padrão do profissional, enquanto a pessoa não digitar outro */
  function suggest(nextUser: string, nextKind: ShiftKind) {
    if (amountTouched) return
    const rate = options.find((s) => s.id === nextUser)?.rates?.[nextKind]
    setAmount(rate != null ? centsToInput(rate) : '')
  }

  function changeKind(next: ShiftKind) {
    setKind(next)
    setStart(SHIFT_KIND_HOURS[next].start)
    setEnd(SHIFT_KIND_HOURS[next].end)
    suggest(userId, next)
  }

  const slots = useMemo(() => {
    if (!day || !start || !end) return []
    if (!repeat || isEdit) return [slotFor(day, start, end)]
    const result = []
    const last = new Date(`${repeatUntil}T12:00`)
    for (let d = new Date(`${day}T12:00`); d <= last && result.length <= MAX_SLOTS; d = addDays(d, 1)) {
      if (weekdays.includes(d.getDay())) result.push(slotFor(dayInput(d), start, end))
    }
    return result
  }, [day, start, end, repeat, isEdit, repeatUntil, weekdays])

  const nextDay = Boolean(end && start && end <= start)

  async function run(action: () => Promise<unknown>) {
    setError(null)
    setPending(true)
    try {
      await action()
      onClose()
    } catch (err) {
      setError(errorText(err))
    } finally {
      setPending(false)
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const amountCents = inputToCents(amount)
    if (!userId) return setError('Selecione o profissional.')
    if (paid) return run(() => update.mutateAsync({ id: shift!.id, notes: notes.trim() || null }))
    if (amountCents === null || !Number.isFinite(amountCents) || amountCents < 0) {
      return setError('Informe o valor do plantão.')
    }
    if (slots.length === 0) return setError('Nenhuma data selecionada para a repetição.')
    if (slots.length > MAX_SLOTS) return setError(`Máximo de ${MAX_SLOTS} plantões por vez. Diminua o período.`)

    if (shift) {
      return run(() =>
        update.mutateAsync({
          id: shift.id,
          userId,
          kind,
          ...slots[0],
          amountCents,
          notes: notes.trim() || null,
        }),
      )
    }
    return run(() => create.mutateAsync({ userId, kind, slots, amountCents, notes: notes.trim() || null }))
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <Alert>{error}</Alert>}
      {paid && (
        <Alert variant="info">
          Pago em {formatInstantDateTime(shift!.paidAt!)}
          {shift!.paidBy && ` por ${shift!.paidBy.name}`}
          {shift!.paymentNotes && ` — ${shift!.paymentNotes}`}. Para alterar horário ou valor, desfaça o pagamento.
        </Alert>
      )}

      <Field label="Profissional">
        {(a11y) => (
          <Select
            {...a11y}
            value={userId}
            disabled={paid}
            onChange={(e) => {
              setUserId(e.target.value)
              suggest(e.target.value, kind)
            }}
            autoFocus={!isEdit}
          >
            <option value="">Selecione...</option>
            {options.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.role === 'admin' ? 'Veterinário (admin)' : ROLE_LABELS[s.role]}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tipo">
          {(a11y) => (
            <Select {...a11y} value={kind} disabled={paid} onChange={(e) => changeKind(e.target.value as ShiftKind)}>
              {SHIFT_KINDS.map((k) => (
                <option key={k} value={k}>
                  {SHIFT_KIND_LABELS[k]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={repeat && !isEdit ? 'Primeiro dia' : 'Dia'}>
          {(a11y) => <Input {...a11y} type="date" value={day} disabled={paid} onChange={(e) => setDay(e.target.value)} required />}
        </Field>
        <Field label="Início">
          {(a11y) => <Input {...a11y} type="time" value={start} disabled={paid} onChange={(e) => setStart(e.target.value)} required />}
        </Field>
        <Field label="Fim" hint={nextDay ? 'Termina no dia seguinte.' : undefined}>
          {(a11y) => <Input {...a11y} type="time" value={end} disabled={paid} onChange={(e) => setEnd(e.target.value)} required />}
        </Field>
      </div>

      <Field
        label="Valor do plantão (R$)"
        hint={
          member && !member.rates
            ? undefined
            : rateCents != null
              ? `Valor padrão de ${member?.name.split(' ')[0]} para ${SHIFT_KIND_LABELS[kind].toLowerCase()}: ${formatCurrency(rateCents)}`
              : member
                ? 'Sem valor padrão para este tipo — cadastre em "Valores" ou informe aqui.'
                : undefined
        }
      >
        {(a11y) => (
          <Input
            {...a11y}
            value={amount}
            disabled={paid}
            onChange={(e) => {
              setAmount(e.target.value)
              setAmountTouched(true)
            }}
            inputMode="decimal"
            className="font-mono"
          />
        )}
      </Field>

      {!isEdit && (
        <fieldset className="rounded-lg border border-border px-4 py-1">
          <Checkbox label="Repetir toda semana" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} />
          {repeat && (
            <div className="space-y-4 pb-4">
              <div>
                <p className="mb-2 text-sm font-medium" id="dias-semana">
                  Dias da semana
                </p>
                <div role="group" aria-labelledby="dias-semana" className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((label, index) => {
                    const on = weekdays.includes(index)
                    return (
                      <button
                        key={label}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setWeekdays(on ? weekdays.filter((d) => d !== index) : [...weekdays, index])}
                        className={`min-h-11 min-w-11 rounded-lg border px-2 text-sm font-semibold transition-colors duration-150 ${
                          on ? 'border-primary bg-primary text-on-primary' : 'border-border bg-card hover:bg-muted'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <Field
                label="Repetir até"
                error={slots.length > MAX_SLOTS ? `Máximo de ${MAX_SLOTS} plantões por vez.` : undefined}
                hint={`${slots.length} plantão(ões) serão criados.`}
              >
                {(a11y) => (
                  <Input {...a11y} type="date" value={repeatUntil} min={day} onChange={(e) => setRepeatUntil(e.target.value)} />
                )}
              </Field>
            </div>
          )}
        </fieldset>
      )}

      <Field label="Observações">
        {(a11y) => <Textarea {...a11y} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />}
      </Field>

      {shift && (
        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          {paid ? (
            <Button variant="secondary" disabled={pending} onClick={() => run(() => unpay.mutateAsync([shift.id]))}>
              Desfazer pagamento
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                disabled={pending}
                onClick={() =>
                  run(() => update.mutateAsync({ id: shift.id, status: shift.status === 'falta' ? 'escalado' : 'falta' }))
                }
              >
                {shift.status === 'falta' ? 'Desfazer falta' : 'Marcar falta'}
              </Button>
              {confirmDelete ? (
                <Button variant="danger" disabled={pending} onClick={() => run(() => remove.mutateAsync(shift.id))}>
                  Confirmar exclusão
                </Button>
              ) : (
                <Button variant="ghost" className="text-destructive" onClick={() => setConfirmDelete(true)}>
                  Excluir plantão
                </Button>
              )}
            </>
          )}
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" loading={pending}>
          {isEdit ? 'Salvar' : slots.length > 1 ? `Escalar ${slots.length} plantões` : 'Escalar'}
        </Button>
      </div>
    </form>
  )
}
