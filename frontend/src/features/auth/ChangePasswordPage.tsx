import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { z } from 'zod'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { applyServerErrors } from '../../lib/form-errors'
import { useAuthenticatedUser, useChangePassword } from './auth-api'
import { PasswordInput } from './PasswordInput'

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual'),
    newPassword: z.string().min(8, 'A senha precisa de pelo menos 8 caracteres').max(128),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'As senhas não conferem',
    path: ['confirmPassword'],
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: 'A nova senha precisa ser diferente da atual',
    path: ['newPassword'],
  })

type FormValues = z.infer<typeof schema>

export function ChangePasswordPage() {
  const user = useAuthenticatedUser()
  const changePassword = useChangePassword()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const pending = user.mustChangePassword

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = handleSubmit(async ({ currentPassword, newPassword }) => {
    setFormError(null)
    setDone(false)
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword })
      reset()
      if (pending) {
        navigate('/', { replace: true })
      } else {
        setDone(true)
      }
    } catch (error) {
      setFormError(applyServerErrors(error, setError))
    }
  })

  return (
    <div className="max-w-md">
      <form
        onSubmit={onSubmit}
        noValidate
        className="space-y-4 rounded-xl border border-border bg-card p-5 sm:p-6"
      >
        {pending && (
          <Alert variant="info">
            Você está usando uma senha provisória. Defina uma nova senha para acessar o sistema.
          </Alert>
        )}
        {done && <Alert variant="success">Senha alterada com sucesso.</Alert>}
        {formError && <Alert>{formError}</Alert>}

        <Field
          label={pending ? 'Senha provisória' : 'Senha atual'}
          error={errors.currentPassword?.message}
        >
          {(a11y) => (
            <PasswordInput
              {...a11y}
              {...register('currentPassword')}
              autoComplete="current-password"
            />
          )}
        </Field>

        <Field label="Nova senha" error={errors.newPassword?.message} hint="Mínimo de 8 caracteres.">
          {(a11y) => (
            <PasswordInput {...a11y} {...register('newPassword')} autoComplete="new-password" />
          )}
        </Field>

        <Field label="Confirme a nova senha" error={errors.confirmPassword?.message}>
          {(a11y) => (
            <PasswordInput {...a11y} {...register('confirmPassword')} autoComplete="new-password" />
          )}
        </Field>

        <Button type="submit" loading={changePassword.isPending}>
          Salvar nova senha
        </Button>
      </form>
    </div>
  )
}
