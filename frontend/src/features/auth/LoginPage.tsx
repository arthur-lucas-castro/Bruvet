import { zodResolver } from '@hookform/resolvers/zod'
import { PawPrint } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { z } from 'zod'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Field'
import { applyServerErrors } from '../../lib/form-errors'
import { useCurrentUser, useLogin } from './auth-api'
import { PasswordInput } from './PasswordInput'

const schema = z.object({
  email: z.email('Informe um e-mail válido'),
  password: z.string().min(1, 'Informe a senha'),
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const { data: user } = useCurrentUser()
  const login = useLogin()
  const navigate = useNavigate()
  const location = useLocation()
  const [formError, setFormError] = useState<string | null>(null)

  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  if (user) return <Navigate to={from} replace />

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      await login.mutateAsync(values)
      navigate(from, { replace: true })
    } catch (error) {
      setFormError(applyServerErrors(error, setError))
    }
  })

  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-on-primary">
            <PawPrint className="size-7" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Bruvet</h1>
          <p className="mt-1 text-sm text-muted-foreground">Entre com sua conta para continuar</p>
        </div>

        <form
          onSubmit={onSubmit}
          noValidate
          className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm"
        >
          {formError && <Alert>{formError}</Alert>}

          <Field label="E-mail" error={errors.email?.message}>
            {(a11y) => (
              <Input
                {...a11y}
                {...register('email')}
                type="email"
                autoComplete="username"
                inputMode="email"
                autoFocus
              />
            )}
          </Field>

          <Field label="Senha" error={errors.password?.message}>
            {(a11y) => (
              <PasswordInput {...a11y} {...register('password')} autoComplete="current-password" />
            )}
          </Field>

          <Button type="submit" loading={login.isPending} className="w-full">
            Entrar
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Esqueceu a senha? Peça a um administrador para redefini-la.
        </p>
      </div>
    </main>
  )
}
