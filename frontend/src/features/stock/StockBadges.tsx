import { Badge } from '../../components/ui/Badge'
import type { StockSummary } from './stock-api'

/** Selos da situação do estoque de um medicamento. */
export function StockBadges({ stock }: { stock: StockSummary }) {
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      {stock.status === 'sem_estoque' ? (
        <Badge tone="danger">Sem estoque</Badge>
      ) : stock.status === 'baixo' ? (
        <Badge tone="warning">Estoque baixo</Badge>
      ) : null}
      {stock.expiringSoon && <Badge tone="warning">Vencendo</Badge>}
      {stock.expiredQuantity > 0 && <Badge tone="danger">Lote vencido</Badge>}
    </span>
  )
}
