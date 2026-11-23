import {
  ClipboardList,
  Contact,
  LayoutDashboard,
  PawPrint,
  Pill,
  Stethoscope,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import type { Role } from '../../features/auth/auth-api'

export type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  /** Perfis que veem o item; ausente = todos. */
  roles?: Role[]
}

export const navItems: NavItem[] = [
  { to: '/', label: 'Painel', icon: LayoutDashboard },
  { to: '/pacientes', label: 'Pacientes', icon: PawPrint },
  { to: '/tutores', label: 'Tutores', icon: Contact },
  { to: '/atendimentos', label: 'Atendimentos', icon: Stethoscope },
  { to: '/estoque', label: 'Estoque', icon: Pill },
  { to: '/procedimentos', label: 'Procedimentos', icon: ClipboardList },
  { to: '/usuarios', label: 'Usuários', icon: UsersRound, roles: ['admin'] },
]

export function navItemsFor(role: Role) {
  return navItems.filter((item) => !item.roles || item.roles.includes(role))
}
