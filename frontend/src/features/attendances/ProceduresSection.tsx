import { LoaderCircle, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Dialog } from '../../components/ui/Dialog'
import { Field, Input } from '../../components/ui/Field'
import { SearchInput } from '../../components/ui/SearchInput'
import { ApiError } from '../../lib/api'
import { formatCurrency } from '../../lib/format'
import { variantLabel } from '../patients/species'
import { useProcedures, type Procedure } from '../procedures/procedures-api'
import {
  useAddProcedure,
  useProcedurePrice,
  useRemoveProcedure,
  type AttendanceDetail,
} from './attendances-api'

type ProceduresSectionProps = { attendance: AttendanceDetail; editable: boolean }

/** Procedimentos realizados, com o preço aplicado conforme espécie e porte do paciente. */
export function ProceduresSection({ attendance, editable }: ProceduresSectionProps) {
  const removeProcedure = useRemoveProcedure(attendance.id)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function remove(itemId: string) {
    setError(null)
    try {
      await removeProcedure.mutateAsync(itemId)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível remover.')
    }
  }

  return (
    <Card
      title="Procedimentos"
      actions={
        editable && (
          <Button onClick={() => setAdding(true)} className="min-h-9 px-3">
            <Plus className="size-4" aria-hidden="true" />
            Lançar
          </Button>
        )
      }
    >
      {error && (
        <div className="mb-3">
          <Alert>{error}</Alert>
        </div>
      )}
      {attendance.procedures.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum procedimento lançado.</p>
      ) : (
        <div className="-mx-5 -my-5">
          <ul className="divide-y divide-border">
            {attendance.procedures.map((item) => (
              <li key={item.id} className="flex items-start gap-2 py-2.5 pl-5 pr-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {item.quantity > 1 && <span className="font-mono">{item.quantity}× </span>}
                    {item.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.species || item.size ? variantLabel(item.species, item.size) : 'Valor padrão'}
                    {item.quantity > 1 && ` · ${formatCurrency(item.priceCents)} cada`}
                  </p>
                  {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
                </div>
                <span className="whitespace-nowrap pt-0.5 font-mono font-medium">
                  {formatCurrency(item.priceCents * item.quantity)}
                </span>
                {editable && (
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    disabled={removeProcedure.isPending}
                    aria-label={`Remover ${item.name}`}
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-destructive"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          <p className="flex items-center justify-between border-t border-border px-5 py-3 font-semibold">
            <span>Total</span>
            <span className="font-mono">{formatCurrency(attendance.totalCents)}</span>
          </p>
        </div>
      )}

      {editable && (
        <AddProcedureDialog attendance={attendance} open={adding} onClose={() => setAdding(false)} />
      )}
    </Card>
  )
}

function AddProcedureDialog({
  attendance,
  open,
  onClose,
}: {
  attendance: AttendanceDetail
  open: boolean
  onClose: () => void
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Lançar procedimento"
      description="O valor considera a espécie e o porte do paciente."
    >
      <AddProcedureForm attendance={attendance} onDone={onClose} />
    </Dialog>
  )
}

function AddProcedureForm({ attendance, onDone }: { attendance: AttendanceDetail; onDone: () => void }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Procedure | null>(null)
  const [quantity, setQuantity] = useState('1')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { data, isFetching } = useProcedures({ q: query })
  const price = useProcedurePrice(selected?.id, attendance.patient.id)
  const addProcedure = useAddProcedure(attendance.id)
  const qty = Number(quantity)
  const validQty = Number.isInteger(qty) && qty >= 1 && qty <= 100

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!selected || !validQty) return
    setError(null)
    try {
      await addProcedure.mutateAsync({ procedureId: selected.id, quantity: qty, notes: notes.trim() || null })
      onDone()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível lançar o procedimento.')
    }
  }

  if (!selected) {
    return (
      <div className="space-y-3">
        <SearchInput value={query} onChange={setQuery} label="Buscar procedimento" placeholder="Nome ou código" />
        <div aria-live="polite" className="max-h-80 overflow-y-auto rounded-lg border border-border">
          {isFetching && !data ? (
            <div className="flex justify-center py-6">
              <LoaderCircle className="size-5 animate-spin text-primary" aria-hidden="true" />
            </div>
          ) : data?.items.length ? (
            <ul className="divide-y divide-border">
              {data.items.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(p)}
                    className="flex min-h-11 w-full items-start justify-between gap-3 px-3 py-2 text-left text-sm transition-colors duration-150 hover:bg-muted/60"
                  >
                    <span>
                      <span className="block font-medium">{p.name}</span>
                      <span className="text-xs text-muted-foreground">{p.category.name}</span>
                    </span>
                    <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                      {p.prices.length ? 'varia' : formatCurrency(p.priceCents)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-4 text-sm text-muted-foreground">Nenhum procedimento ativo encontrado.</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <Alert>{error}</Alert>}
      <div className="flex items-start justify-between gap-3 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2">
        <div>
          <p className="font-medium">{selected.name}</p>
          <p className="text-sm">
            {price.isPending ? (
              <span className="text-muted-foreground">Calculando valor…</span>
            ) : price.data ? (
              <>
                <span className="font-mono font-semibold">{formatCurrency(price.data.priceCents)}</span>{' '}
                <span className="text-muted-foreground">
                  ·{' '}
                  {price.data.variant
                    ? variantLabel(price.data.variant.species, price.data.variant.size)
                    : 'valor padrão'}
                </span>
              </>
            ) : null}
          </p>
        </div>
        <Button variant="ghost" onClick={() => setSelected(null)} className="min-h-9 px-3">
          Trocar
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
        <Field label="Quantidade" error={validQty ? undefined : 'De 1 a 100'}>
          {(a11y) => (
            <Input
              {...a11y}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              inputMode="numeric"
              className="font-mono"
            />
          )}
        </Field>
        <Field label="Observação (opcional)">
          {(a11y) => <Input {...a11y} value={notes} onChange={(e) => setNotes(e.target.value)} />}
        </Field>
      </div>

      {price.data && validQty && qty > 1 && (
        <p className="text-sm text-muted-foreground">
          Total: <span className="font-mono font-semibold text-foreground">{formatCurrency(price.data.priceCents * qty)}</span>
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" loading={addProcedure.isPending} disabled={!validQty}>
          Lançar procedimento
        </Button>
      </div>
    </form>
  )
}
