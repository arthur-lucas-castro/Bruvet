import { BadgePercent, Printer, Trash2, Undo2, Wallet } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Field'
import { PageHeader } from '../../components/ui/PageHeader'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { ApiError } from '../../lib/api'
import { formatCpf, formatCurrency, formatInstantDateTime, formatPhone, formatRecordCode, inputToCents } from '../../lib/format'
import { KIND_LABELS, formatAttendanceCode } from '../attendances/constants'
import { useAuthenticatedUser } from '../auth/auth-api'
import { variantLabel } from '../patients/species'
import { formatQuantity } from '../stock/units'
import { DiscountDialog, PaymentDialog, VoidPaymentDialog } from './BillDialogs'
import { BillStatusBadge } from './BillStatusBadge'
import {
  PAYMENT_LABELS,
  useAddBillItem,
  useBill,
  useBills,
  usePayBill,
  usePayMany,
  useRemoveBillItem,
  useSetDiscount,
  useSettings,
  useVoidPayment,
  type Bill,
  type Payment,
} from './billing-api'

export function BillPage() {
  const { id } = useParams()
  const { data: bill, isPending, error } = useBill(id)

  if (isPending) return <LoadingState />
  if (error) {
    return <ErrorState message={error instanceof ApiError && error.status === 404 ? 'Comanda não encontrada.' : undefined} />
  }
  return <BillView bill={bill} />
}

type Dialog = 'discount' | 'pay' | 'payAll' | null

function BillView({ bill }: { bill: Bill }) {
  const user = useAuthenticatedUser()
  const isAdmin = user.role === 'admin'
  const { data: settings } = useSettings()
  const setDiscount = useSetDiscount(bill.id)
  const pay = usePayBill(bill.id)
  const payMany = usePayMany()
  const voidPayment = useVoidPayment()
  const removeItem = useRemoveBillItem(bill.id)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [voiding, setVoiding] = useState<Payment | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const { attendance, totals } = bill
  const { patient } = attendance
  const cancelled = totals.status === 'cancelada'
  const canCharge = !cancelled && totals.balanceCents > 0

  // Outras comandas em aberto do mesmo tutor (para quitar tudo de uma vez)
  const { data: tutorBills } = useBills({ tutorId: patient.tutor.id, status: 'aberta', pageSize: 30 })
  const openOfTutor = (tutorBills?.items ?? []).filter((b) => b.totals.balanceCents > 0)
  const others = openOfTutor.filter((b) => b.id !== bill.id)
  const allBalanceCents = openOfTutor.reduce((sum, b) => sum + b.totals.balanceCents, 0)

  async function remove(itemId: string) {
    setActionError(null)
    try {
      await removeItem.mutateAsync(itemId)
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Não foi possível remover o item.')
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        backTo={{ to: `/atendimentos/${attendance.id}`, label: 'Atendimento' }}
        title={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            Comanda
            <BillStatusBadge status={totals.status} />
          </span>
        }
        subtitle={
          <span className="font-mono">
            Atd. nº {formatAttendanceCode(attendance.code)} · {KIND_LABELS[attendance.kind]} ·{' '}
            {formatInstantDateTime(attendance.startedAt)}
          </span>
        }
        actions={
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer className="size-4" aria-hidden="true" />
              Imprimir
            </Button>
            {!cancelled && (
              <Button variant="secondary" onClick={() => setDialog('discount')} disabled={totals.subtotalCents === 0}>
                <BadgePercent className="size-4" aria-hidden="true" />
                Desconto
              </Button>
            )}
            {canCharge && (
              <Button onClick={() => setDialog('pay')}>
                <Wallet className="size-4" aria-hidden="true" />
                Receber
              </Button>
            )}
          </div>
        }
      />

      {actionError && <Alert>{actionError}</Alert>}
      {cancelled && <Alert variant="info">O atendimento foi cancelado; esta comanda não é cobrada.</Alert>}
      {attendance.status === 'aberto' && !cancelled && (
        <Alert variant="info">O atendimento ainda está em andamento: novos procedimentos e medicamentos podem entrar na comanda.</Alert>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card title="Itens">
            <BillLines bill={bill} canEdit={!cancelled} onRemoveItem={remove} removing={removeItem.isPending} />
          </Card>
          {!cancelled && (
            <div className="print:hidden">
              <AddItemForm billId={bill.id} />
            </div>
          )}
          <PaymentsCard bill={bill} isAdmin={isAdmin} onVoid={setVoiding} />
        </div>

        <div className="space-y-5 lg:sticky lg:top-20">
          <Card title="Resumo">
            <dl className="space-y-1.5 text-sm">
              <SummaryRow label="Procedimentos" value={totals.proceduresCents} />
              {totals.medicationsCents > 0 && <SummaryRow label="Medicamentos" value={totals.medicationsCents} />}
              {totals.extrasCents > 0 && <SummaryRow label="Itens avulsos" value={totals.extrasCents} />}
              <SummaryRow label="Subtotal" value={totals.subtotalCents} strong />
              {totals.discountCents > 0 && <SummaryRow label="Desconto" value={-totals.discountCents} />}
              <div className="my-2 border-t border-border" />
              <SummaryRow label="Total" value={totals.totalCents} strong large />
              <SummaryRow label="Pago" value={totals.paidCents} />
              <SummaryRow label="Saldo a pagar" value={totals.balanceCents} strong />
            </dl>
            {bill.discountCents > 0 && bill.discountReason && (
              <p className="mt-3 text-xs text-muted-foreground">
                Desconto: {bill.discountReason}
                {bill.discountBy && ` · ${bill.discountBy.name}`}
              </p>
            )}
          </Card>

          <Card title="Tutor e paciente">
            <p className="font-medium">
              <Link to={`/tutores/${patient.tutor.id}`} className="hover:text-primary">
                {patient.tutor.name}
              </Link>
            </p>
            <p className="font-mono text-sm text-muted-foreground">
              {formatPhone(patient.tutor.phone)}
              {patient.tutor.cpf && ` · CPF ${formatCpf(patient.tutor.cpf)}`}
            </p>
            <p className="mt-2 text-sm">
              Paciente:{' '}
              <Link to={`/pacientes/${patient.id}`} className="hover:text-primary">
                {patient.name}
              </Link>{' '}
              <span className="font-mono text-xs text-muted-foreground">nº {formatRecordCode(patient.code)}</span>
            </p>
            <p className="text-sm text-muted-foreground">Veterinário: {attendance.veterinarian.name}</p>
          </Card>

          {others.length > 0 && (
            <Card title="Outras comandas em aberto do tutor" className="print:hidden">
              <ul className="space-y-2 text-sm">
                {others.map((b) => (
                  <li key={b.id} className="flex items-baseline justify-between gap-3">
                    <Link to={`/comandas/${b.id}`} className="hover:text-primary">
                      {b.attendance.patient.name} · atd. {formatAttendanceCode(b.attendance.code)}
                    </Link>
                    <span className="font-mono">{formatCurrency(b.totals.balanceCents)}</span>
                  </li>
                ))}
              </ul>
              <Button className="mt-4 w-full" variant="secondary" onClick={() => setDialog('payAll')}>
                Quitar todas ({formatCurrency(allBalanceCents)})
              </Button>
            </Card>
          )}
        </div>
      </div>

      <DiscountDialog
        open={dialog === 'discount'}
        onClose={() => setDialog(null)}
        subtotalCents={totals.subtotalCents}
        currentCents={bill.discountCents}
        currentReason={bill.discountReason}
        limitPercent={isAdmin ? null : (settings?.discountLimitPercent ?? 0)}
        onSubmit={(input) => setDiscount.mutateAsync(input)}
      />
      <PaymentDialog
        open={dialog === 'pay'}
        onClose={() => setDialog(null)}
        title="Receber pagamento"
        description={`${patient.name} — saldo de ${formatCurrency(totals.balanceCents)}.`}
        balanceCents={totals.balanceCents}
        allowPartial
        onSubmit={(input) => pay.mutateAsync(input)}
      />
      <PaymentDialog
        open={dialog === 'payAll'}
        onClose={() => setDialog(null)}
        title="Quitar comandas do tutor"
        description={`${openOfTutor.length} comandas de ${patient.tutor.name}: cada uma recebe um pagamento do seu saldo.`}
        balanceCents={allBalanceCents}
        allowPartial={false}
        onSubmit={({ method, installments, notes }) =>
          payMany.mutateAsync({ billIds: openOfTutor.map((b) => b.id), method, installments, notes })
        }
      />
      <VoidPaymentDialog
        open={Boolean(voiding)}
        onClose={() => setVoiding(null)}
        description={voiding ? `${formatCurrency(voiding.amountCents)} em ${PAYMENT_LABELS[voiding.method]}, recebido por ${voiding.receivedBy.name}.` : ''}
        onSubmit={(reason) => voidPayment.mutateAsync({ paymentId: voiding!.id, reason })}
      />
    </div>
  )
}

function SummaryRow({ label, value, strong, large }: { label: string; value: number; strong?: boolean; large?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 ${strong ? 'font-semibold' : ''}`}>
      <dt className={strong ? '' : 'text-muted-foreground'}>{label}</dt>
      <dd className={`font-mono ${large ? 'text-lg' : ''}`}>{formatCurrency(value)}</dd>
    </div>
  )
}

function BillLines({
  bill,
  canEdit,
  onRemoveItem,
  removing,
}: {
  bill: Bill
  canEdit: boolean
  onRemoveItem: (id: string) => void
  removing: boolean
}) {
  const { procedures, stockMovements } = bill.attendance
  const empty = procedures.length === 0 && stockMovements.length === 0 && bill.items.length === 0
  if (empty) return <p className="text-sm text-muted-foreground">Nada lançado ainda.</p>

  return (
    <div className="-mx-5 -my-5">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th scope="col" className="px-5 py-2.5 font-semibold">Item</th>
            <th scope="col" className="px-3 py-2.5 text-right font-semibold">Qtd.</th>
            <th scope="col" className="hidden px-3 py-2.5 text-right font-semibold sm:table-cell">Unitário</th>
            <th scope="col" className="px-5 py-2.5 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {procedures.map((p) => (
            <tr key={p.id}>
              <td className="px-5 py-2.5">
                {p.name}
                {(p.species || p.size) && (
                  <span className="block text-xs text-muted-foreground">{variantLabel(p.species, p.size)}</span>
                )}
              </td>
              <td className="px-3 py-2.5 text-right font-mono">{p.quantity}</td>
              <td className="hidden px-3 py-2.5 text-right font-mono sm:table-cell">{formatCurrency(p.priceCents)}</td>
              <td className="px-5 py-2.5 text-right font-mono">{formatCurrency(p.priceCents * p.quantity)}</td>
            </tr>
          ))}
          {stockMovements.map((m) => (
            <tr key={m.id}>
              <td className="px-5 py-2.5">
                {m.medication.name}
                <span className="block text-xs text-muted-foreground">Medicamento</span>
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono">{formatQuantity(-m.quantity, m.medication.unit)}</td>
              <td className="hidden px-3 py-2.5 text-right font-mono sm:table-cell">{formatCurrency(m.salePriceCents ?? 0)}</td>
              <td className="px-5 py-2.5 text-right font-mono">{formatCurrency(Math.round(-m.quantity * (m.salePriceCents ?? 0)))}</td>
            </tr>
          ))}
          {bill.items.map((item) => (
            <tr key={item.id}>
              <td className="px-5 py-2.5">
                <span className="flex items-center gap-2">
                  {item.description}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.id)}
                      disabled={removing}
                      aria-label={`Remover ${item.description}`}
                      className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive print:hidden"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  )}
                </span>
                <span className="block text-xs text-muted-foreground">Item avulso · {item.addedBy.name}</span>
              </td>
              <td className="px-3 py-2.5 text-right font-mono">{item.quantity}</td>
              <td className="hidden px-3 py-2.5 text-right font-mono sm:table-cell">{formatCurrency(item.unitPriceCents)}</td>
              <td className="px-5 py-2.5 text-right font-mono">{formatCurrency(item.unitPriceCents * item.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AddItemForm({ billId }: { billId: string }) {
  const addItem = useAddBillItem(billId)
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [price, setPrice] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const cents = inputToCents(price)
    const qty = Number(quantity)
    if (description.trim().length < 2) return setError('Descreva o item.')
    if (!Number.isInteger(qty) || qty < 1) return setError('Quantidade inválida.')
    if (cents === null || !Number.isFinite(cents) || cents <= 0) return setError('Informe o valor.')
    setError(null)
    try {
      await addItem.mutateAsync({ description: description.trim(), quantity: qty, unitPriceCents: cents })
      setDescription('')
      setQuantity('1')
      setPrice('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível adicionar.')
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded-xl border border-dashed border-border bg-card p-4">
      <p className="text-sm font-medium">Adicionar item avulso</p>
      <p className="text-xs text-muted-foreground">Produto, taxa ou serviço fora do catálogo (ex.: ração, banho, taxa de entrega).</p>
      {error && <Alert>{error}</Alert>}
      <div className="grid gap-2 sm:grid-cols-[1fr_5rem_8rem_auto]">
        <Input value={description} onChange={(e) => setDescription(e.target.value)} aria-label="Descrição do item" placeholder="Descrição" />
        <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} aria-label="Quantidade" inputMode="numeric" className="font-mono" />
        <Input value={price} onChange={(e) => setPrice(e.target.value)} aria-label="Valor unitário em reais" inputMode="decimal" placeholder="0,00" className="text-right font-mono" />
        <Button type="submit" variant="secondary" loading={addItem.isPending}>
          Adicionar
        </Button>
      </div>
    </form>
  )
}

function PaymentsCard({ bill, isAdmin, onVoid }: { bill: Bill; isAdmin: boolean; onVoid: (p: Payment) => void }) {
  return (
    <Card title="Pagamentos">
      {bill.payments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum pagamento registrado.</p>
      ) : (
        <ul className="-mx-5 -my-5 divide-y divide-border">
          {bill.payments.map((p) => {
            const voided = Boolean(p.voidedAt)
            return (
              <li key={p.id} className={`flex items-start gap-2 py-2.5 pl-5 pr-2 text-sm ${voided ? 'text-muted-foreground' : ''}`}>
                <div className="min-w-0 flex-1">
                  <p className={`font-medium ${voided ? 'line-through' : ''}`}>
                    {PAYMENT_LABELS[p.method]}
                    {p.installments && p.installments > 1 && ` · ${p.installments}x`}
                    {p.groupId && <span className="font-normal text-muted-foreground"> · quitação conjunta</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatInstantDateTime(p.receivedAt)} · {p.receivedBy.name}
                    {p.notes && ` · ${p.notes}`}
                  </p>
                  {voided && (
                    <p className="text-xs text-destructive">
                      Estornado por {p.voidedBy?.name}: {p.voidReason}
                    </p>
                  )}
                </div>
                <span className={`whitespace-nowrap pt-0.5 font-mono font-medium ${voided ? 'line-through' : ''}`}>
                  {formatCurrency(p.amountCents)}
                </span>
                {isAdmin && !voided && (
                  <button
                    type="button"
                    onClick={() => onVoid(p)}
                    aria-label={`Estornar pagamento de ${formatCurrency(p.amountCents)}`}
                    title="Estornar pagamento"
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground print:hidden"
                  >
                    <Undo2 className="size-4" aria-hidden="true" />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
