import { Receipt } from 'lucide-react'
import { ButtonLink } from '../../components/ui/ButtonLink'
import { Card } from '../../components/ui/Card'
import { LoadingState } from '../../components/ui/States'
import { formatCurrency } from '../../lib/format'
import { BillStatusBadge } from './BillStatusBadge'
import { useBillByAttendance } from './billing-api'

/** Resumo da comanda dentro da tela do atendimento. */
export function AttendanceBillCard({ attendanceId }: { attendanceId: string }) {
  const { data: bill, isPending } = useBillByAttendance(attendanceId)

  return (
    <Card title="Comanda" actions={bill && <BillStatusBadge status={bill.totals.status} />}>
      {isPending ? (
        <LoadingState />
      ) : !bill ? (
        <p className="text-sm text-muted-foreground">Comanda indisponível.</p>
      ) : (
        <>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Total</dt>
              <dd className="font-mono">{formatCurrency(bill.totals.totalCents)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Pago</dt>
              <dd className="font-mono">{formatCurrency(bill.totals.paidCents)}</dd>
            </div>
            <div className="flex justify-between gap-3 font-semibold">
              <dt>Saldo</dt>
              <dd className="font-mono">{formatCurrency(bill.totals.balanceCents)}</dd>
            </div>
          </dl>
          <ButtonLink to={`/comandas/${bill.id}`} variant="secondary" className="mt-4 w-full">
            <Receipt className="size-4" aria-hidden="true" />
            Abrir comanda
          </ButtonLink>
        </>
      )}
    </Card>
  )
}
