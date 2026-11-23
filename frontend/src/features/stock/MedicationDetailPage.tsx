import { ArrowDownToLine, ArrowUpFromLine, PackageX, Pencil, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, InfoList } from '../../components/ui/Card'
import { Checkbox } from '../../components/ui/Field'
import { PageHeader } from '../../components/ui/PageHeader'
import { Pagination } from '../../components/ui/Pagination'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { ApiError } from '../../lib/api'
import { formatCurrency, formatDate, formatRecordCode } from '../../lib/format'
import { useAuthenticatedUser } from '../auth/auth-api'
import { MedicationFormDialog } from './MedicationFormDialog'
import { AdjustDialog, EntryDialog, ExitDialog } from './MovementDialogs'
import { StockBadges } from './StockBadges'
import { useMedication, useMovements, type MedicationDetail, type StockBatch } from './stock-api'
import { MOVEMENT_LABELS, formatNumber, formatQuantity } from './units'

type OpenDialog = 'edit' | 'entry' | 'exit' | null

export function MedicationDetailPage() {
  const { id } = useParams()
  const user = useAuthenticatedUser()
  const canManage = user.role === 'admin' || user.role === 'veterinario'
  const { data: medication, isPending, error } = useMedication(id)
  const [dialog, setDialog] = useState<OpenDialog>(null)
  const [adjusting, setAdjusting] = useState<StockBatch | null>(null)
  const [showEmpty, setShowEmpty] = useState(false)

  if (isPending) return <LoadingState />
  if (error) {
    return (
      <ErrorState
        message={error instanceof ApiError && error.status === 404 ? 'Medicamento não encontrado.' : undefined}
      />
    )
  }

  const { stock } = medication
  const batches = showEmpty ? medication.batches : medication.batches.filter((b) => b.quantity > 0)
  const emptyCount = medication.batches.length - medication.batches.filter((b) => b.quantity > 0).length

  return (
    <div className="space-y-5">
      <PageHeader
        backTo={{ to: '/estoque', label: 'Estoque' }}
        title={medication.name}
        subtitle={
          [medication.activeIngredient, medication.concentration, medication.presentation]
            .filter(Boolean)
            .join(' · ') || undefined
        }
        actions={
          canManage && (
            <>
              <Button variant="secondary" onClick={() => setDialog('edit')}>
                <Pencil className="size-4" aria-hidden="true" />
                Editar
              </Button>
              <Button variant="secondary" onClick={() => setDialog('exit')}>
                <ArrowUpFromLine className="size-4" aria-hidden="true" />
                Saída
              </Button>
              <Button onClick={() => setDialog('entry')}>
                <ArrowDownToLine className="size-4" aria-hidden="true" />
                Entrada
              </Button>
            </>
          )
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {medication.controlled && <Badge tone="primary">Controlado</Badge>}
        {!medication.active && <Badge>Inativo</Badge>}
        <StockBadges stock={stock} />
      </div>

      {stock.expiredQuantity > 0 && (
        <div
          role="note"
          className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-red-50 px-4 py-3 text-red-900"
        >
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
          <p className="text-sm">
            Há {formatQuantity(stock.expiredQuantity, medication.unit)} em lotes vencidos. Eles não são
            usados nas saídas; registre o descarte em “Perda / descarte”.
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Disponível" value={formatQuantity(stock.available, medication.unit)} />
        <StatTile
          label="Estoque mínimo"
          value={medication.minStock > 0 ? formatQuantity(medication.minStock, medication.unit) : 'Não definido'}
        />
        <StatTile label="Próxima validade" value={stock.nextExpiry ? formatDate(stock.nextExpiry) : '—'} />
      </div>

      <Card
        title="Lotes"
        actions={
          emptyCount > 0 && (
            <Checkbox
              label={`Mostrar zerados (${emptyCount})`}
              checked={showEmpty}
              onChange={(e) => setShowEmpty(e.target.checked)}
              className="min-h-9 py-0"
            />
          )
        }
      >
        <BatchesTable
          medication={medication}
          batches={batches}
          onAdjust={canManage ? setAdjusting : undefined}
        />
      </Card>

      <MovementsCard medication={medication} />

      {(medication.notes || medication.manufacturer) && (
        <Card title="Informações">
          <InfoList
            items={[
              { label: 'Fabricante', value: medication.manufacturer },
              { label: 'Observações', value: medication.notes && <span className="whitespace-pre-line">{medication.notes}</span> },
            ]}
          />
        </Card>
      )}

      {canManage && (
        <>
          <MedicationFormDialog open={dialog === 'edit'} medication={medication} onClose={() => setDialog(null)} />
          <EntryDialog open={dialog === 'entry'} medication={medication} onClose={() => setDialog(null)} />
          <ExitDialog open={dialog === 'exit'} medication={medication} onClose={() => setDialog(null)} />
          <AdjustDialog
            medication={medication}
            batch={adjusting}
            canAdjust={user.role === 'admin'}
            onClose={() => setAdjusting(null)}
          />
        </>
      )}
    </div>
  )
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold">{value}</p>
    </div>
  )
}

function BatchesTable({
  medication,
  batches,
  onAdjust,
}: {
  medication: MedicationDetail
  batches: StockBatch[]
  onAdjust?: (batch: StockBatch) => void
}) {
  if (batches.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum lote com saldo. Registre uma entrada.</p>
  }

  return (
    <div className="-mx-5 -my-5">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th scope="col" className="px-5 py-2.5 font-semibold">
              Lote
            </th>
            <th scope="col" className="px-3 py-2.5 font-semibold">
              Validade
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-semibold">
              Saldo
            </th>
            {onAdjust && (
              <th scope="col" className="px-3 py-2.5">
                <span className="sr-only">Ações</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {batches.map((batch) => (
            <tr key={batch.id} className={batch.quantity === 0 ? 'text-muted-foreground' : ''}>
              <td className="px-5 py-2.5">
                <p className="font-mono font-medium">{batch.batchNumber}</p>
                {(batch.supplier || batch.unitCostCents != null) && (
                  <p className="text-xs text-muted-foreground">
                    {[batch.supplier, batch.unitCostCents != null && `${formatCurrency(batch.unitCostCents)}/un.`]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
              </td>
              <td className="px-3 py-2.5">
                <span className="whitespace-nowrap">{formatDate(batch.expiresAt)}</span>
                {batch.quantity > 0 && batch.expired && (
                  <span className="ml-1.5">
                    <Badge tone="danger">Vencido</Badge>
                  </span>
                )}
                {batch.quantity > 0 && batch.expiringSoon && (
                  <span className="ml-1.5">
                    <Badge tone="warning">Vencendo</Badge>
                  </span>
                )}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono">
                {formatQuantity(batch.quantity, medication.unit)}
              </td>
              {onAdjust && (
                <td className="px-2 py-1 text-right">
                  <button
                    type="button"
                    onClick={() => onAdjust(batch)}
                    aria-label={`Perda ou ajuste do lote ${batch.batchNumber}`}
                    title="Perda / ajuste"
                    className="inline-flex size-11 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
                  >
                    <PackageX className="size-4" aria-hidden="true" />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

function MovementsCard({ medication }: { medication: MedicationDetail }) {
  const [page, setPage] = useState(1)
  const { data, isPending } = useMovements(medication.id, page)

  return (
    <Card title="Movimentações">
      {isPending ? (
        <LoadingState />
      ) : !data?.items.length ? (
        <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada.</p>
      ) : (
        <div className="-mx-5 -my-5">
          <ul className="divide-y divide-border">
            {data.items.map((m) => (
              <li key={m.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 px-5 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">
                    {MOVEMENT_LABELS[m.type]}{' '}
                    <span className="font-mono text-xs font-normal text-muted-foreground">lote {m.batch.batchNumber}</span>
                  </p>
                  {m.patient && (
                    <p>
                      Paciente:{' '}
                      <Link to={`/pacientes/${m.patient.id}`} className="text-primary hover:underline">
                        {m.patient.name}
                      </Link>{' '}
                      <span className="font-mono text-xs text-muted-foreground">
                        nº {formatRecordCode(m.patient.code)}
                      </span>
                      {m.attendance && (
                        <>
                          {' · '}
                          <Link to={`/atendimentos/${m.attendance.id}`} className="text-primary hover:underline">
                            atendimento {String(m.attendance.code).padStart(6, '0')}
                          </Link>
                        </>
                      )}
                    </p>
                  )}
                  {m.reason && <p className="text-muted-foreground">{m.reason}</p>}
                  <p className="text-xs text-muted-foreground">
                    {dateTimeFormatter.format(new Date(m.createdAt))} · {m.user.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-mono font-semibold ${m.quantity > 0 ? 'text-success' : 'text-destructive'}`}>
                    {m.quantity > 0 ? '+' : '−'}
                    {formatNumber(Math.abs(m.quantity))}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">saldo do lote {formatNumber(m.balanceAfter)}</p>
                </div>
              </li>
            ))}
          </ul>
          <Pagination page={page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
        </div>
      )}
    </Card>
  )
}
