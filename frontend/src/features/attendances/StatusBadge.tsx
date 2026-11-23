import { Badge } from '../../components/ui/Badge'
import { STATUS_LABELS, type AttendanceStatus } from './constants'

export function StatusBadge({ status }: { status: AttendanceStatus }) {
  const tone = status === 'aberto' ? 'warning' : status === 'finalizado' ? 'primary' : 'neutral'
  return <Badge tone={tone}>{STATUS_LABELS[status]}</Badge>
}
