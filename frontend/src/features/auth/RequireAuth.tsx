import { LoaderCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { Button } from '../../components/ui/Button'
import { useCurrentUser, type Role } from './auth-api'

export const CHANGE_PASSWORD_PATH = '/trocar-senha'

/** Protege as rotas internas: exige login e a troca de senha provisória. */
export function RequireAuth() {
  const { data: user, isPending, isError, refetch, isFetching } = useCurrentUser()
  const location = useLocation()

  if (isPending) {
    return (
      <div className="flex min-h-dvh items-center justify-center" role="status">
        <LoaderCircle className="size-8 animate-spin text-primary" aria-hidden="true" />
        <span className="sr-only">Carregando...</span>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-4 text-center">
        <p className="font-semibold">Não foi possível conectar ao servidor.</p>
        <Button onClick={() => refetch()} loading={isFetching}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  if (user.mustChangePassword && location.pathname !== CHANGE_PASSWORD_PATH) {
    return <Navigate to={CHANGE_PASSWORD_PATH} replace />
  }

  return <Outlet />
}

type RequireRoleProps = {
  roles: Role[]
  children: ReactNode
}

/** Mostra o conteúdo só para os perfis informados. */
export function RequireRole({ roles, children }: RequireRoleProps) {
  const { data: user } = useCurrentUser()

  if (!user || !roles.includes(user.role)) {
    return (
      <div className="rounded-xl border border-border bg-card px-6 py-16 text-center">
        <p className="font-semibold">Acesso restrito</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Seu perfil não tem permissão para acessar esta página.
        </p>
      </div>
    )
  }

  return children
}
