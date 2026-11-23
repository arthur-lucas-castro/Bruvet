import { LoaderCircle, UserRoundPlus, X } from 'lucide-react'
import { useId, useState } from 'react'
import { Link } from 'react-router'
import { SearchInput } from '../../components/ui/SearchInput'
import { formatCpf, formatPhone } from '../../lib/format'
import { useTutors, type Tutor } from '../tutors/tutors-api'

type TutorPickerProps = {
  value: Pick<Tutor, 'id' | 'name' | 'phone'> | null
  onChange: (tutor: Pick<Tutor, 'id' | 'name' | 'phone'> | null) => void
  error?: string
}

/** Busca e seleção do tutor no cadastro do paciente, com atalho para cadastrar um novo. */
export function TutorPicker({ value, onChange, error }: TutorPickerProps) {
  const [query, setQuery] = useState('')
  const labelId = useId()
  const errorId = useId()
  const { data, isFetching } = useTutors({ q: query, pageSize: 6 })

  return (
    <div role="group" aria-labelledby={labelId} aria-describedby={error ? errorId : undefined} className="space-y-1.5">
      <p id={labelId} className="text-sm font-medium">
        Tutor
      </p>

      {value ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate font-medium">{value.name}</p>
            <p className="font-mono text-xs text-muted-foreground">{formatPhone(value.phone)}</p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
            Trocar
          </button>
        </div>
      ) : (
        <div className={`rounded-lg border ${error ? 'border-destructive' : 'border-border'}`}>
          <div className="p-2">
            <SearchInput
              value={query}
              onChange={setQuery}
              label="Buscar tutor"
              placeholder="Buscar por nome, CPF ou telefone"
            />
          </div>
          <div aria-live="polite" className="border-t border-border">
            {isFetching && !data ? (
              <div className="flex justify-center py-4">
                <LoaderCircle className="size-5 animate-spin text-primary" aria-hidden="true" />
              </div>
            ) : data?.items.length ? (
              <ul className="max-h-64 divide-y divide-border overflow-y-auto">
                {data.items.map((tutor) => (
                  <li key={tutor.id}>
                    <button
                      type="button"
                      onClick={() => onChange(tutor)}
                      className="flex min-h-11 w-full flex-col items-start px-3 py-2 text-left transition-colors duration-150 hover:bg-muted/60"
                    >
                      <span className="font-medium">{tutor.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {formatPhone(tutor.phone)}
                        {tutor.cpf && ` · ${formatCpf(tutor.cpf)}`}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-3 py-3 text-sm text-muted-foreground">
                {query ? 'Nenhum tutor encontrado.' : 'Nenhum tutor cadastrado ainda.'}
              </p>
            )}
            <Link
              to="/tutores/novo?next=paciente"
              className="flex min-h-11 items-center gap-2 border-t border-border px-3 text-sm font-semibold text-primary hover:bg-muted/60"
            >
              <UserRoundPlus className="size-4" aria-hidden="true" />
              Cadastrar novo tutor
            </Link>
          </div>
        </div>
      )}

      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
