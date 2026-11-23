import { LoaderCircle, Plus, Undo2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Dialog } from '../../components/ui/Dialog'
import { Field, Input, Select } from '../../components/ui/Field'
import { SearchInput } from '../../components/ui/SearchInput'
import { ApiError } from '../../lib/api'
import { formatDate, parseDecimal } from '../../lib/format'
import { useMedication, useMedications, type Medication } from '../stock/stock-api'
import { UNIT_LABELS, formatQuantity } from '../stock/units'
import {
  useAddMedication,
  useReverseMedication,
  type AttendanceDetail,
  type AttendanceMovement,
} from './attendances-api'

type MedicationsSectionProps = { attendance: AttendanceDetail; editable: boolean }

/** Medicamentos usados no atendimento. Cada lançamento dá saída no estoque. */
export function MedicationsSection({ attendance, editable }: MedicationsSectionProps) {
  const [adding, setAdding] = useState(false)
  const [reversing, setReversing] = useState<AttendanceMovement | null>(null)
  const reverse = useReverseMedication(attendance.id)
  // Mostra as saídas; os estornos aparecem como marcação na saída original
  const exits = attendance.stockMovements.filter((m) => m.type === 'saida')

  return (
    <Card
      title="Medicamentos usados"
      actions={
        editable && (
          <Button onClick={() => setAdding(true)} className="min-h-9 px-3">
            <Plus className="size-4" aria-hidden="true" />
            Lançar
          </Button>
        )
      }
    >
      {exits.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum medicamento lançado.</p>
      ) : (
        <ul className="-mx-5 -my-5 divide-y divide-border">
          {exits.map((m) => {
            const reversed = Boolean(m.reversedBy)
            return (
              <li key={m.id} className={`flex items-start gap-2 py-2.5 pl-5 pr-2 text-sm ${reversed ? 'text-muted-foreground' : ''}`}>
                <div className="min-w-0 flex-1">
                  <p className={`font-medium ${reversed ? 'line-through' : ''}`}>{m.medication.name}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-mono">lote {m.batch.batchNumber}</span> · {m.user.name}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {m.medication.controlled && <Badge tone="primary">Controlado</Badge>}
                    {reversed && <Badge>Estornado</Badge>}
                  </div>
                </div>
                <span className={`whitespace-nowrap pt-0.5 font-mono font-medium ${reversed ? 'line-through' : ''}`}>
                  {formatQuantity(Math.abs(m.quantity), m.medication.unit)}
                </span>
                {editable && !reversed && (
                  <button
                    type="button"
                    onClick={() => setReversing(m)}
                    aria-label={`Estornar ${m.medication.name}`}
                    title="Estornar (devolver ao estoque)"
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
                  >
                    <Undo2 className="size-4" aria-hidden="true" />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {editable && (
        <>
          <Dialog
            open={adding}
            onClose={() => setAdding(false)}
            title="Lançar medicamento"
            description="A quantidade sai do estoque, ligada a este paciente e atendimento."
          >
            <AddMedicationForm attendance={attendance} onDone={() => setAdding(false)} />
          </Dialog>
          <ConfirmDialog
            open={Boolean(reversing)}
            onClose={() => setReversing(null)}
            title="Estornar medicamento"
            description={
              reversing
                ? `${formatQuantity(Math.abs(reversing.quantity), reversing.medication.unit)} de ${reversing.medication.name} voltarão ao lote ${reversing.batch.batchNumber}.`
                : ''
            }
            confirmLabel="Estornar"
            onConfirm={() => reverse.mutateAsync(reversing!.id)}
          />
        </>
      )}
    </Card>
  )
}

function AddMedicationForm({ attendance, onDone }: { attendance: AttendanceDetail; onDone: () => void }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Medication | null>(null)
  const { data, isFetching } = useMedications({ q: query, pageSize: 8 })

  if (!selected) {
    return (
      <div className="space-y-3">
        <SearchInput value={query} onChange={setQuery} label="Buscar medicamento" placeholder="Nome ou princípio ativo" />
        <div aria-live="polite" className="max-h-80 overflow-y-auto rounded-lg border border-border">
          {isFetching && !data ? (
            <div className="flex justify-center py-6">
              <LoaderCircle className="size-5 animate-spin text-primary" aria-hidden="true" />
            </div>
          ) : data?.items.length ? (
            <ul className="divide-y divide-border">
              {data.items.map((m) => {
                const empty = m.stock.available <= 0
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(m)}
                      disabled={empty}
                      className="flex min-h-11 w-full items-start justify-between gap-3 px-3 py-2 text-left text-sm transition-colors duration-150 hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span>
                        <span className="block font-medium">{m.name}</span>
                        {m.controlled && <span className="text-xs text-primary">Controlado</span>}
                      </span>
                      <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                        {empty ? 'sem estoque' : formatQuantity(m.stock.available, m.unit)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="px-3 py-4 text-sm text-muted-foreground">Nenhum medicamento encontrado.</p>
          )}
        </div>
      </div>
    )
  }

  return <MedicationQuantityForm attendance={attendance} medication={selected} onBack={() => setSelected(null)} onDone={onDone} />
}

function MedicationQuantityForm({
  attendance,
  medication,
  onBack,
  onDone,
}: {
  attendance: AttendanceDetail
  medication: Medication
  onBack: () => void
  onDone: () => void
}) {
  const { data: detail } = useMedication(medication.id)
  const addMedication = useAddMedication(attendance.id)
  const [quantity, setQuantity] = useState('')
  const [batchId, setBatchId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const parsed = parseDecimal(quantity)
  const usableBatches = detail?.batches.filter((b) => b.quantity > 0 && !b.expired) ?? []

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (parsed === null || !Number.isFinite(parsed) || parsed <= 0) {
      setError('Informe uma quantidade maior que zero.')
      return
    }
    setError(null)
    try {
      await addMedication.mutateAsync({ medicationId: medication.id, quantity: parsed, batchId: batchId || null, reason: null })
      onDone()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível lançar o medicamento.')
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <Alert>{error}</Alert>}
      <div className="flex items-start justify-between gap-3 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2">
        <div>
          <p className="font-medium">{medication.name}</p>
          <p className="text-sm text-muted-foreground">
            Disponível: <span className="font-mono">{formatQuantity(medication.stock.available, medication.unit)}</span>
          </p>
        </div>
        <Button variant="ghost" onClick={onBack} className="min-h-9 px-3">
          Trocar
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={`Quantidade (${UNIT_LABELS[medication.unit].many})`}>
          {(a11y) => (
            <Input
              {...a11y}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              inputMode="decimal"
              className="font-mono"
              autoFocus
            />
          )}
        </Field>
        <Field label="Lote">
          {(a11y) => (
            <Select {...a11y} value={batchId} onChange={(e) => setBatchId(e.target.value)}>
              <option value="">Automático (vence primeiro)</option>
              {usableBatches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batchNumber} — {formatQuantity(b.quantity, medication.unit)} — val. {formatDate(b.expiresAt)}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" loading={addMedication.isPending}>
          Lançar medicamento
        </Button>
      </div>
    </form>
  )
}
