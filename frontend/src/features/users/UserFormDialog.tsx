import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { Field, Input, Select } from '../../components/ui/Field'
import { applyServerErrors } from '../../lib/form-errors'
import { ROLES, ROLE_LABELS, type User } from '../auth/auth-api'
import { PasswordInput } from '../auth/PasswordInput'
import { useCreateUser, useUpdateUser } from './users-api'

const baseSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome'),
  email: z.string().trim(),
  role: z.enum(ROLES),
  crmv: z.string().trim(),
  password: z.string(),
})

type FormValues = z.infer<typeof baseSchema>

const createSchema = baseSchema.superRefine((data, ctx) => {
  validateCrmv(data, ctx)
  if (!z.email().safeParse(data.email).success) {
    ctx.addIssue({ code: 'custom', path: ['email'], message: 'Informe um e-mail válido' })
  }
  if (data.password.length < 8) {
    ctx.addIssue({
      code: 'custom',
      path: ['password'],
      message: 'A senha precisa de pelo menos 8 caracteres',
    })
  }
})

const editSchema = baseSchema.superRefine(validateCrmv)

function validateCrmv(data: FormValues, ctx: z.RefinementCtx) {
  if (data.role === 'veterinario' && !data.crmv) {
    ctx.addIssue({ code: 'custom', path: ['crmv'], message: 'Informe o CRMV do veterinário' })
  }
}

type UserFormDialogProps = {
  open: boolean
  onClose: () => void
  /** Usuário a editar; ausente = cadastro novo. */
  user?: User
}

export function UserFormDialog({ open, onClose, user }: UserFormDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={user ? 'Editar usuário' : 'Novo usuário'}
      description={
        user
          ? undefined
          : 'A pessoa receberá uma senha provisória e precisará trocá-la no primeiro acesso.'
      }
    >
      {/* O Dialog só monta o conteúdo quando aberto: o formulário começa limpo a cada abertura */}
      <UserForm user={user} onDone={onClose} />
    </Dialog>
  )
}

function UserForm({ user, onDone }: { user?: User; onDone: () => void }) {
  const isEdit = Boolean(user)
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      role: user?.role ?? 'veterinario',
      crmv: user?.crmv ?? '',
      password: '',
    },
  })

  const role = useWatch({ control, name: 'role' })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      const crmv = values.crmv || null
      if (user) {
        await updateUser.mutateAsync({ id: user.id, name: values.name, role: values.role, crmv })
      } else {
        await createUser.mutateAsync({ ...values, crmv })
      }
      onDone()
    } catch (error) {
      setFormError(applyServerErrors(error, setError))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {formError && <Alert>{formError}</Alert>}

      <Field label="Nome completo" error={errors.name?.message}>
        {(a11y) => <Input {...a11y} {...register('name')} autoComplete="off" autoFocus />}
      </Field>

      <Field
        label="E-mail"
        error={errors.email?.message}
        hint={isEdit ? 'O e-mail de acesso não pode ser alterado.' : undefined}
      >
        {(a11y) => (
          <Input
            {...a11y}
            {...register('email')}
            type="email"
            inputMode="email"
            autoComplete="off"
            disabled={isEdit}
          />
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Perfil" error={errors.role?.message}>
          {(a11y) => (
            <Select {...a11y} {...register('role')}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field
          label={role === 'veterinario' ? 'CRMV' : 'CRMV (opcional)'}
          error={errors.crmv?.message}
        >
          {(a11y) => <Input {...a11y} {...register('crmv')} placeholder="CRMV-SP 12345" />}
        </Field>
      </div>

      {!isEdit && (
        <Field
          label="Senha provisória"
          error={errors.password?.message}
          hint="Mínimo de 8 caracteres. Repasse para a pessoa com segurança."
        >
          {(a11y) => (
            <PasswordInput {...a11y} {...register('password')} autoComplete="new-password" />
          )}
        </Field>
      )}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {isEdit ? 'Salvar alterações' : 'Cadastrar usuário'}
        </Button>
      </div>
    </form>
  )
}
