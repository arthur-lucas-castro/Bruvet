import { KeyRound, LogOut, PawPrint, X } from 'lucide-react'
import { NavLink } from 'react-router'
import { ROLE_LABELS, useAuthenticatedUser, useLogout } from '../../features/auth/auth-api'
import { CHANGE_PASSWORD_PATH } from '../../features/auth/RequireAuth'
import { navItemsFor } from './nav-items'

type SidebarProps = {
  open: boolean
  onClose: () => void
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-150 ${
    isActive
      ? 'bg-primary text-on-primary'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  }`

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter((part) => part.length > 2 || /^[A-Z]/.test(part))
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const user = useAuthenticatedUser()
  const logout = useLogout()

  return (
    <>
      {/* Fundo escuro da gaveta no mobile */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-slate-900/40 transition-opacity duration-200 lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-card transition-transform duration-200 lg:translate-x-0 print:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-border px-5">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-on-primary">
              <PawPrint className="size-5" aria-hidden="true" />
            </span>
            <span className="text-lg font-bold tracking-tight">Bruvet</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted lg:hidden"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Principal" className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {navItemsFor(user.role).map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink to={to} end={to === '/'} onClick={onClose} className={linkClass}>
                  <Icon className="size-5 shrink-0" aria-hidden="true" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-primary"
            >
              {initials(user.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</p>
            </div>
          </div>
          <NavLink to={CHANGE_PASSWORD_PATH} onClick={onClose} className={linkClass}>
            <KeyRound className="size-5 shrink-0" aria-hidden="true" />
            Trocar senha
          </NavLink>
          <button
            type="button"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
          >
            <LogOut className="size-5 shrink-0" aria-hidden="true" />
            Sair
          </button>
        </div>
      </aside>
    </>
  )
}
