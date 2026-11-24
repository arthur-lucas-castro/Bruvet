import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ROLE_LABELS } from '../auth/auth-api'
import { SHIFT_KIND_LABELS, formatTime, useShifts, type Shift } from './shifts-api'

/** Painel: quem está de plantão agora e quem ainda entra hoje. */
export function OnDutyCard() {
  const [now] = useState(() => new Date())
  const range = useMemo(() => {
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    return { from: now.toISOString(), until: endOfDay.toISOString() }
  }, [now])
  const { data, isPending, isError } = useShifts(range)
  if (isPending || isError) return null

  const shifts = data.filter((s) => s.state !== 'falta')
  const current = shifts.filter((s) => new Date(s.startsAt) <= now)
  const later = shifts.filter((s) => new Date(s.startsAt) > now)

  return (
    <section aria-labelledby="plantao-agora" className="rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <h2 id="plantao-agora" className="font-semibold">
          De plantão
        </h2>
        <Link to="/escala" className="text-sm font-semibold text-primary hover:underline">
          Ver escala
        </Link>
      </header>
      <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Agora</h3>
          {current.length ? (
            <ShiftList items={current} />
          ) : (
            <p className="mt-1.5 text-sm text-muted-foreground">Ninguém escalado neste horário.</p>
          )}
        </div>
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ainda hoje</h3>
          {later.length ? (
            <ShiftList items={later} />
          ) : (
            <p className="mt-1.5 text-sm text-muted-foreground">Nenhuma entrada prevista.</p>
          )}
        </div>
      </div>
    </section>
  )
}

function ShiftList({ items }: { items: Shift[] }) {
  return (
    <ul className="mt-1.5 space-y-1 text-sm">
      {items.map((s) => (
        <li key={s.id} className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-medium">{s.user.name}</span>
          <span className="text-xs text-muted-foreground">
            {s.user.role === 'enfermeiro' ? ROLE_LABELS.enfermeiro : 'Veterinário'} · {SHIFT_KIND_LABELS[s.kind]} ·{' '}
            <span className="font-mono">
              {formatTime(s.startsAt)}–{formatTime(s.endsAt)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}
