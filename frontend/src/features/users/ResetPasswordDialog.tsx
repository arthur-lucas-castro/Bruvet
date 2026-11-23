import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { Field } from '../../components/ui/Field'
import { applyServerErrors } from '../../lib/form-errors'
import type { User } from '../auth/auth-api'
import { PasswordInput } from '../auth/PasswordInput'
import { useResetPassword } from './users-api'

const schema = z.object({
  password: z.string().min(8, 'A senha precisa de pelo menos 8 caracteres').max(128),
})

type FormValues = z.infer<typeof schema>

type ResetPasswordDialogProps = {
  user: User | null
  onClose: () => void
}

export function ResetPasswordDialog({ user, onClose }: ResetPasswordDialogProps) {
  return (
    <Dialog
      open={Boolean(user)}
      onClose={onClose}
      title="Redefinir senha"
      description={
        user
          ? `Defina uma senha provisória para ${user.name}. As sessões abertas serão encerradas e a troca será exigida no próximo acesso.`
          : undefined
      }
    >
      {/* O Dialog só monta o conteúdo quando aberto: o formulário começa limpo a cada abertura */}
      {user && <ResetPasswordForm user={user} onDone={onClose} />}
    </Dialog>
  )
}

function ResetPasswordForm({ user, onDone }: { user: User; onDone: () => void }) {
  const resetPassword = useResetPassword()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { password: '' } })

  const onSubmit = handleSubmit(async ({ password }) => {
    setFormError(null)
    try {
      await resetPassword.mutateAsync({ id: user.id, password })
      onDone()
    } catch (error) {
      setFormError(applyServerErrors(error, setError))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {formError && <Alert>{formError}</Alert>}

      <Field label="Senha provisória" error={errors.password?.message} hint="Mínimo de 8 caracteres.">
        {(a11y) => (
          <PasswordInput {...a11y} {...register('password')} autoComplete="new-password" autoFocus />
        )}
      </Field>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" loading={resetPassword.isPending}>
          Redefinir senha
        </Button>
      </div>
    </form>
  )
}
