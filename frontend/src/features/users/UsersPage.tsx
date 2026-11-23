import { KeyRound, LoaderCircle, Pencil, Plus, Power } from 'lucide-react'
import { useState } from 'react'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ApiError } from '../../lib/api'
import { ROLE_LABELS, useAuthenticatedUser, type User } from '../auth/auth-api'
import { ResetPasswordDialog } from './ResetPasswordDialog'
import { UserFormDialog } from './UserFormDialog'
import { useUpdateUser, useUsers } from './users-api'

type FormState = { open: false } | { open: true; user?: User }

const iconButton =
  'flex size-11 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40'

export function UsersPage() {
  const me = useAuthenticatedUser()
  const { data: users, isPending, isError } = useUsers()
  const updateUser = useUpdateUser()
  const [form, setForm] = useState<FormState>({ open: false })
  const [resetting, setResetting] = useState<User | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  async function toggleActive(user: User) {
    setActionError(null)
    try {
      await updateUser.mutateAsync({ id: user.id, active: !user.active })
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : 'Não foi possível atualizar.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Cadastre a equipe e defina o que cada pessoa pode acessar.
        </p>
        <Button onClick={() => setForm({ open: true })}>
          <Plus className="size-4" aria-hidden="true" />
          Novo usuário
        </Button>
      </div>

      {actionError && <Alert>{actionError}</Alert>}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {isPending ? (
          <div className="flex justify-center py-12" role="status">
            <LoaderCircle className="size-6 animate-spin text-primary" aria-hidden="true" />
            <span className="sr-only">Carregando usuários...</span>
          </div>
        ) : isError ? (
          <p className="px-5 py-12 text-center text-sm text-destructive">
            Não foi possível carregar os usuários.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Nome
                </th>
                <th scope="col" className="hidden px-4 py-3 font-semibold md:table-cell">
                  Perfil
                </th>
                <th scope="col" className="hidden px-4 py-3 font-semibold lg:table-cell">
                  CRMV
                </th>
                <th scope="col" className="hidden px-4 py-3 font-semibold sm:table-cell">
                  Situação
                </th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => {
                const isMe = user.id === me.id
                return (
                  <tr key={user.id} className={user.active ? '' : 'bg-muted/30'}>
                    <td className="px-4 py-3">
                      <p className={`font-medium ${user.active ? '' : 'text-muted-foreground'}`}>
                        {user.name}
                        {isMe && <span className="ml-1.5 text-muted-foreground">(você)</span>}
                      </p>
                      <p className="break-all text-muted-foreground">{user.email}</p>
                      {/* No celular, perfil e situação aparecem abaixo do nome */}
                      <div className="mt-1.5 flex flex-wrap gap-1.5 md:hidden">
                        <Badge tone="primary">{ROLE_LABELS[user.role]}</Badge>
                        {!user.active && (
                          <span className="sm:hidden">
                            <Badge>Inativo</Badge>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <Badge tone="primary">{ROLE_LABELS[user.role]}</Badge>
                    </td>
                    <td className="hidden px-4 py-3 font-mono text-xs lg:table-cell">
                      {user.crmv ?? <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      {!user.active ? (
                        <Badge>Inativo</Badge>
                      ) : user.mustChangePassword ? (
                        <Badge tone="warning">Senha provisória</Badge>
                      ) : (
                        <Badge tone="primary">Ativo</Badge>
                      )}
                    </td>
                    <td className="px-2 py-1">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          className={iconButton}
                          onClick={() => setForm({ open: true, user })}
                          aria-label={`Editar ${user.name}`}
                          title="Editar"
                        >
                          <Pencil className="size-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className={iconButton}
                          onClick={() => setResetting(user)}
                          aria-label={`Redefinir senha de ${user.name}`}
                          title="Redefinir senha"
                        >
                          <KeyRound className="size-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className={iconButton}
                          onClick={() => toggleActive(user)}
                          disabled={isMe || updateUser.isPending}
                          aria-label={`${user.active ? 'Desativar' : 'Reativar'} ${user.name}`}
                          title={isMe ? 'Você não pode desativar a si mesmo' : user.active ? 'Desativar' : 'Reativar'}
                        >
                          <Power
                            className={`size-4 ${user.active ? '' : 'text-success'}`}
                            aria-hidden="true"
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <UserFormDialog
        open={form.open}
        user={form.open ? form.user : undefined}
        onClose={() => setForm({ open: false })}
      />
      <ResetPasswordDialog user={resetting} onClose={() => setResetting(null)} />
    </div>
  )
}
