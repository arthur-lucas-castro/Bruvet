import { Link } from 'react-router'
import { useAuthenticatedUser } from '../auth/auth-api'
import { useAttendances } from './attendances-api'
import { KIND_LABELS } from './constants'

const time = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
const LIMIT = 6

/** Atendimentos em andamento, para o painel inicial (o veterinário vê primeiro os seus). */
export function OpenAttendancesCard() {
  const user = useAuthenticatedUser()
  const isVet = user.role === 'veterinario'
  const { data, isPending, isError } = useAttendances({
    status: 'aberto',
    veterinarianId: isVet ? user.id : undefined,
    pageSize: LIMIT,
  })
  if (isPending || isError) return null

  return (
    <section aria-labelledby="atendimentos-abertos" className="rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <h2 id="atendimentos-abertos" className="font-semibold">
          {isVet ? 'Meus atendimentos em andamento' : 'Atendimentos em andamento'}{' '}
          <span className="font-mono text-muted-foreground">({data.total})</span>
        </h2>
        <Link
          to={isVet ? '/atendimentos?meus=1' : '/atendimentos'}
          className="text-sm font-semibold text-primary hover:underline"
        >
          Ver todos
        </Link>
      </header>
      {data.items.length === 0 ? (
        <p className="px-5 py-4 text-sm text-muted-foreground">Nenhum atendimento em andamento.</p>
      ) : (
        <ul className="divide-y divide-border">
          {data.items.map((a) => (
            <li key={a.id}>
              <Link
                to={`/atendimentos/${a.id}`}
                className="flex flex-wrap items-baseline justify-between gap-x-4 px-5 py-3 transition-colors duration-150 hover:bg-muted/40"
              >
                <span className="text-sm">
                  <span className="font-medium">{a.patient.name}</span>{' '}
                  <span className="text-muted-foreground">
                    · {KIND_LABELS[a.kind]}
                    {!isVet && ` · ${a.veterinarian.name}`}
                  </span>
                </span>
                <time dateTime={a.startedAt} className="font-mono text-xs text-muted-foreground">
                  {time.format(new Date(a.startedAt))}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
