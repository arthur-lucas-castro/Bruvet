import { LoaderCircle, X } from 'lucide-react'
import { useId, useState } from 'react'
import { SearchInput } from '../../components/ui/SearchInput'
import { formatRecordCode } from '../../lib/format'
import { usePatients } from './patients-api'
import { SPECIES_LABELS } from './species'

export type PickedPatient = { id: string; name: string; code: number; tutorName: string }

type PatientPickerProps = {
  label: string
  value: PickedPatient | null
  onChange: (patient: PickedPatient | null) => void
  hint?: string
}

/** Busca e seleção de um paciente ativo (nome, prontuário, microchip ou tutor). */
export function PatientPicker({ label, value, onChange, hint }: PatientPickerProps) {
  const [query, setQuery] = useState('')
  const labelId = useId()
  const { data, isFetching } = usePatients({ q: query, pageSize: 6 })

  return (
    <div role="group" aria-labelledby={labelId} className="space-y-1.5">
      <p id={labelId} className="text-sm font-medium">
        {label}
      </p>

      {value ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate font-medium">{value.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              <span className="font-mono">Nº {formatRecordCode(value.code)}</span> · Tutor: {value.tutorName}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
            Remover
          </button>
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          <div className="p-2">
            <SearchInput
              value={query}
              onChange={setQuery}
              label={`Buscar: ${label}`}
              placeholder="Nome, prontuário ou tutor"
            />
          </div>
          {query && (
            <div aria-live="polite" className="border-t border-border">
              {isFetching && !data ? (
                <div className="flex justify-center py-4">
                  <LoaderCircle className="size-5 animate-spin text-primary" aria-hidden="true" />
                </div>
              ) : data?.items.length ? (
                <ul className="max-h-56 divide-y divide-border overflow-y-auto">
                  {data.items.map((patient) => (
                    <li key={patient.id}>
                      <button
                        type="button"
                        onClick={() =>
                          onChange({
                            id: patient.id,
                            name: patient.name,
                            code: patient.code,
                            tutorName: patient.tutor.name,
                          })
                        }
                        className="flex min-h-11 w-full flex-col items-start px-3 py-2 text-left transition-colors duration-150 hover:bg-muted/60"
                      >
                        <span className="font-medium">{patient.name}</span>
                        <span className="text-xs text-muted-foreground">
                          <span className="font-mono">Nº {formatRecordCode(patient.code)}</span> ·{' '}
                          {SPECIES_LABELS[patient.species]} · Tutor: {patient.tutor.name}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-3 py-3 text-sm text-muted-foreground">Nenhum paciente encontrado.</p>
              )}
            </div>
          )}
        </div>
      )}
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </div>
  )
}
