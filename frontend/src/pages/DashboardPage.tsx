import { useQuery } from '@tanstack/react-query'
import { CircleCheck, CircleX, LoaderCircle } from 'lucide-react'
import { Link } from 'react-router'
import { navItemsFor } from '../components/layout/nav-items'
import { useAuthenticatedUser } from '../features/auth/auth-api'
import { OpenAttendancesCard } from '../features/attendances/OpenAttendancesCard'
import { FinanceSnapshotCard } from '../features/finance/FinanceSnapshotCard'
import { StockAlertsCard } from '../features/stock/StockAlertsCard'
import { api } from '../lib/api'

type Health = { status: string; database: string }

function ApiStatus() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.get<Health>('/health'),
  })

  if (isPending) {
    return (
      <span className="flex items-center gap-2 text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> Verificando servidor...
      </span>
    )
  }

  if (isError || data.database !== 'ok') {
    return (
      <span className="flex items-center gap-2 text-destructive">
        <CircleX className="size-4" aria-hidden="true" /> Servidor ou banco indisponível
      </span>
    )
  }

  return (
    <span className="flex items-center gap-2 text-success">
      <CircleCheck className="size-4" aria-hidden="true" /> Servidor e banco funcionando
    </span>
  )
}

export function DashboardPage() {
  const user = useAuthenticatedUser()
  // Só mostra os módulos que o perfil da pessoa pode acessar
  const modules = navItemsFor(user.role).filter((item) => item.to !== '/')

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold">Olá, {user.name.split(' ')[0]}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sistema de gestão do hospital veterinário.
        </p>
        <div className="mt-4 text-sm font-medium" role="status">
          <ApiStatus />
        </div>
      </section>

      {user.role === 'admin' && <FinanceSnapshotCard />}

      <OpenAttendancesCard />

      <StockAlertsCard />

      <section aria-labelledby="modulos">
        <h2 id="modulos" className="mb-3 text-sm font-semibold text-muted-foreground">
          Módulos
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {modules.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <Link
                to={to}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-5 transition-colors duration-150 hover:border-primary"
              >
                <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="font-medium">{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
