import { UsersRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Field'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { ApiError } from '../../lib/api'
import { centsToInput, inputToCents } from '../../lib/format'
import { ROLE_LABELS } from '../auth/auth-api'
import { SHIFT_KINDS, SHIFT_KIND_LABELS, useSaveRates, useStaff, type ShiftKind, type StaffMember } from './shifts-api'

/** Valor padrão do plantão de cada profissional por tipo (admin). */
export function ShiftRatesTab() {
  const { data, isPending, isError } = useStaff()

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        O valor é copiado para o plantão ao escalar e pode ser ajustado nele; mudar aqui não altera plantões já escalados.
        Aparecem aqui os usuários com perfil Veterinário ou Enfermagem (e administradores com CRMV).
      </p>
      <section aria-label="Valores por profissional" className="rounded-xl border border-border bg-card">
        {isPending ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState />
        ) : data.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title="Nenhum veterinário ou enfermeiro cadastrado"
            description="Cadastre a equipe em Usuários."
          />
        ) : (
          <ul className="divide-y divide-border">
            {data.map((member) => (
              <li key={member.id}>
                <RateRow member={member} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function RateRow({ member }: { member: StaffMember }) {
  const save = useSaveRates()
  const [values, setValues] = useState(
    () => Object.fromEntries(SHIFT_KINDS.map((k) => [k, centsToInput(member.rates?.[k])])) as Record<ShiftKind, string>,
  )
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setMessage(null)
    const parsed = Object.fromEntries(SHIFT_KINDS.map((k) => [k, inputToCents(values[k])])) as Record<
      ShiftKind,
      number | null
    >
    if (Object.values(parsed).some((v) => v !== null && (!Number.isFinite(v) || v < 0))) {
      return setMessage({ ok: false, text: 'Valor inválido.' })
    }
    try {
      await save.mutateAsync({ userId: member.id, ...parsed })
      setMessage({ ok: true, text: 'Salvo.' })
    } catch (err) {
      setMessage({ ok: false, text: err instanceof ApiError ? err.message : 'Não foi possível salvar.' })
    }
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-3 px-5 py-4 sm:grid-cols-3 lg:grid-cols-[minmax(12rem,1fr)_repeat(3,9rem)_auto] lg:items-end"
    >
      <div className="sm:col-span-3 lg:col-span-1">
        <p className="font-medium">{member.name}</p>
        <p className="text-xs text-muted-foreground">
          {member.role === 'enfermeiro' ? ROLE_LABELS.enfermeiro : 'Veterinário'}
          {member.crmv && ` · ${member.crmv}`}
        </p>
      </div>
      {SHIFT_KINDS.map((k) => (
        <label key={k} className="block space-y-1">
          <span className="block text-xs font-medium text-muted-foreground">{SHIFT_KIND_LABELS[k]} (R$)</span>
          <Input
            value={values[k]}
            onChange={(e) => setValues({ ...values, [k]: e.target.value })}
            inputMode="decimal"
            placeholder="—"
            className="font-mono"
          />
        </label>
      ))}
      <div className="flex items-center gap-3 sm:col-span-3 lg:col-span-1">
        <Button type="submit" variant="secondary" loading={save.isPending}>
          Salvar
        </Button>
        <span role="status" className={`text-sm ${message?.ok ? 'text-success' : 'text-destructive'}`}>
          {message?.text}
        </span>
      </div>
    </form>
  )
}
