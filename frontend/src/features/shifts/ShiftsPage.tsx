import { CalendarClock, ChevronLeft, ChevronRight, Clock, Moon, Plus, Sun, type LucideIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Field, Select } from '../../components/ui/Field'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { formatCurrency } from '../../lib/format'
import { ROLE_LABELS, useAuthenticatedUser } from '../auth/auth-api'
import { MyShiftsCard } from './MyShiftsCard'
import { ShiftFormDialog } from './ShiftFormDialog'
import { ShiftPaymentsTab } from './ShiftPaymentsTab'
import { ShiftRatesTab } from './ShiftRatesTab'
import {
  SHIFT_KIND_LABELS,
  SHIFT_STATE_LABELS,
  addDays,
  dayInput,
  formatTime,
  useShifts,
  useStaff,
  weekStart,
  type Shift,
  type ShiftKind,
} from './shifts-api'

const KIND_ICONS: Record<ShiftKind, LucideIcon> = { diurno: Sun, noturno: Moon, '24h': Clock }

type Tab = 'escala' | 'pagamentos' | 'valores'
const TABS: { id: Tab; label: string }[] = [
  { id: 'escala', label: 'Escala' },
  { id: 'pagamentos', label: 'Pagamentos' },
  { id: 'valores', label: 'Valores por profissional' },
]

const weekdayFormat = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' })
const dayMonthFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' })
const longFormat = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' })

export function ShiftsPage() {
  const user = useAuthenticatedUser()
  const isAdmin = user.role === 'admin'
  const [params, setParams] = useSearchParams()
  const tab: Tab = isAdmin ? ((params.get('aba') as Tab | null) ?? 'escala') : 'escala'

  return (
    <div className="space-y-5">
      <PageHeader
        title="Escala de plantões"
        subtitle={isAdmin ? 'Monte a escala de veterinários e enfermagem e controle o pagamento dos plantões.' : 'Quem está de plantão em cada dia.'}
      />

      {isAdmin && (
        <div role="group" aria-label="Seções" className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={tab === t.id}
              onClick={() => setParams(t.id === 'escala' ? {} : { aba: t.id }, { replace: true })}
              className={`min-h-11 rounded-lg border px-4 text-sm font-semibold transition-colors duration-150 ${
                tab === t.id ? 'border-primary bg-primary text-on-primary' : 'border-border bg-card hover:bg-muted'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {tab === 'escala' && <WeekSchedule isAdmin={isAdmin} viewerId={user.id} />}
      {tab === 'pagamentos' && <ShiftPaymentsTab />}
      {tab === 'valores' && <ShiftRatesTab />}
    </div>
  )
}

function WeekSchedule({ isAdmin, viewerId }: { isAdmin: boolean; viewerId: string }) {
  const [start, setStart] = useState(() => weekStart(new Date()))
  const [userId, setUserId] = useState('')
  const [role, setRole] = useState<'' | 'veterinario' | 'enfermeiro'>('')
  const [dialog, setDialog] = useState<{ shift?: Shift; day?: string } | null>(null)

  const range = useMemo(() => ({ from: start.toISOString(), until: addDays(start, 7).toISOString() }), [start])
  const staff = useStaff()
  const { data, isPending, isError, isPlaceholderData } = useShifts({ ...range, userId: userId || undefined })

  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  const [today] = useState(() => dayInput(new Date()))
  const shown = (data ?? []).filter((s) => !role || (role === 'enfermeiro' ? s.user.role === 'enfermeiro' : s.user.role !== 'enfermeiro'))
  // Cada plantão aparece no dia em que começa
  const byDay = (day: Date) => shown.filter((s) => dayInput(new Date(s.startsAt)) === dayInput(day))
  const weekTotal = isAdmin ? shown.filter((s) => s.state !== 'falta').reduce((t, s) => t + (s.amountCents ?? 0), 0) : null

  return (
    <div className="space-y-5">
      {!isAdmin && <MyShiftsCard />}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="secondary" aria-label="Semana anterior" onClick={() => setStart(addDays(start, -7))} className="px-3">
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Button>
          <Button variant="secondary" onClick={() => setStart(weekStart(new Date()))}>
            Hoje
          </Button>
          <Button variant="secondary" aria-label="Próxima semana" onClick={() => setStart(addDays(start, 7))} className="px-3">
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
          <p className="ml-2 font-semibold" aria-live="polite">
            {longFormat.format(start)} a {longFormat.format(addDays(start, 6))}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="Profissional" className="sm:w-56">
            {(a11y) => (
              <Select {...a11y} value={userId} onChange={(e) => setUserId(e.target.value)}>
                <option value="">Todos</option>
                {staff.data?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Equipe" className="sm:w-44">
            {(a11y) => (
              <Select {...a11y} value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
                <option value="">Todas</option>
                <option value="veterinario">Veterinários</option>
                <option value="enfermeiro">Enfermagem</option>
              </Select>
            )}
          </Field>
          {isAdmin && (
            <Button onClick={() => setDialog({ day: dayInput(start) <= today && today <= dayInput(addDays(start, 6)) ? today : dayInput(start) })}>
              <Plus className="size-4" aria-hidden="true" /> Novo plantão
            </Button>
          )}
        </div>
      </div>

      {isPending ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message="Não foi possível carregar a escala." />
      ) : (
        <>
          {shown.length === 0 && (
            <div className="rounded-xl border border-border bg-card">
              <EmptyState
                icon={CalendarClock}
                title="Nenhum plantão nesta semana"
                description={isAdmin ? 'Use "Novo plantão" ou o + de cada dia para escalar a equipe.' : undefined}
              />
            </div>
          )}
          <ol
            className={`grid gap-3 md:grid-cols-2 xl:grid-cols-7 ${isPlaceholderData ? 'opacity-60 transition-opacity' : ''}`}
            aria-label="Dias da semana"
          >
            {days.map((day) => {
              const key = dayInput(day)
              const items = byDay(day)
              const isToday = key === today
              return (
                <li
                  key={key}
                  className={`flex min-h-32 flex-col rounded-xl border bg-card ${isToday ? 'border-primary ring-2 ring-primary/20' : 'border-border'}`}
                >
                  <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
                    <h3 className="text-sm font-semibold capitalize">
                      {weekdayFormat.format(day).replace('.', '')} <span className="font-mono text-muted-foreground">{dayMonthFormat.format(day)}</span>
                      {isToday && <span className="sr-only"> (hoje)</span>}
                    </h3>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setDialog({ day: key })}
                        aria-label={`Escalar plantão em ${dayMonthFormat.format(day)}`}
                        className="-mr-1.5 flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Plus className="size-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                  <ul className="flex-1 space-y-2 p-2">
                    {items.length === 0 && <li className="px-1 py-2 text-xs text-muted-foreground">Sem plantão</li>}
                    {items.map((s) => (
                      <li key={s.id}>
                        <ShiftChip shift={s} mine={s.user.id === viewerId} onOpen={isAdmin ? () => setDialog({ shift: s }) : undefined} />
                      </li>
                    ))}
                  </ul>
                </li>
              )
            })}
          </ol>
          {weekTotal !== null && shown.length > 0 && (
            <p className="text-right text-sm text-muted-foreground">
              Total da semana (sem faltas): <span className="font-mono font-semibold text-foreground">{formatCurrency(weekTotal)}</span>
            </p>
          )}
        </>
      )}

      {staff.data && (
        <ShiftFormDialog
          open={dialog !== null}
          onClose={() => setDialog(null)}
          staff={staff.data}
          shift={dialog?.shift}
          defaultDay={dialog?.day}
        />
      )}
    </div>
  )
}

function ShiftChip({ shift, mine, onOpen }: { shift: Shift; mine: boolean; onOpen?: () => void }) {
  const Icon = KIND_ICONS[shift.kind]
  const absent = shift.state === 'falta'
  const body = (
    <>
      <span className="flex items-start gap-2">
        <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-sm font-semibold ${absent ? 'line-through decoration-2' : ''}`}>
            {shift.user.name}
            {mine && <span className="font-normal text-muted-foreground"> (você)</span>}
          </span>
          <span className="block text-xs text-muted-foreground">
            {shift.user.role === 'enfermeiro' ? ROLE_LABELS.enfermeiro : 'Veterinário'} · {SHIFT_KIND_LABELS[shift.kind]}
          </span>
          <span className="block font-mono text-xs">
            {formatTime(shift.startsAt)}–{formatTime(shift.endsAt)}
          </span>
        </span>
      </span>
      <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {shift.state !== 'agendado' && (
          <Badge tone={absent ? 'danger' : shift.state === 'em_andamento' ? 'primary' : 'neutral'}>
            {SHIFT_STATE_LABELS[shift.state]}
          </Badge>
        )}
        {shift.paidAt && <Badge tone="primary">Pago</Badge>}
        {shift.amountCents !== null && <span className="ml-auto font-mono text-xs font-semibold">{formatCurrency(shift.amountCents)}</span>}
      </span>
    </>
  )
  const className = `block w-full rounded-lg border px-2.5 py-2 text-left ${absent ? 'border-destructive/30 bg-red-50/60' : 'border-border bg-background'}`
  return onOpen ? (
    <button
      type="button"
      onClick={onOpen}
      className={`${className} transition-colors duration-150 hover:border-primary`}
      aria-label={`${shift.user.name}, ${SHIFT_KIND_LABELS[shift.kind]}, ${formatTime(shift.startsAt)} a ${formatTime(shift.endsAt)}: editar`}
    >
      {body}
    </button>
  ) : (
    <div className={className}>{body}</div>
  )
}
