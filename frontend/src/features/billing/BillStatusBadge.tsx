import { Badge } from '../../components/ui/Badge'
import { BILL_STATUS_LABELS, type BillStatus } from './billing-api'

export function BillStatusBadge({ status }: { status: BillStatus }) {
  const tone = status === 'aberta' ? 'warning' : status === 'paga' ? 'primary' : 'neutral'
  return <Badge tone={tone}>{BILL_STATUS_LABELS[status]}</Badge>
}
