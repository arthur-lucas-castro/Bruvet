import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '../../components/ui/Badge'
import { formatAge, formatRecordCode } from '../../lib/format'
import type { Patient } from './patients-api'
import { SPECIES_ICONS, SPECIES_LABELS } from './species'

/** Linha de paciente com ícone da espécie, usada em listas compactas (ex.: ficha do tutor). */
export function PatientRow({ patient }: { patient: Patient }) {
  const Icon = SPECIES_ICONS[patient.species]
  const age = formatAge(patient.birthDate, patient.deceasedAt)
  const details = [SPECIES_LABELS[patient.species], patient.breed, age].filter(Boolean).join(' · ')

  return (
    <li>
      <Link
        to={`/pacientes/${patient.id}`}
        className="flex items-center gap-3 px-5 py-3 transition-colors duration-150 hover:bg-muted/40"
      >
        <PatientAvatar species={patient.species} muted={Boolean(patient.deceasedAt)} icon={Icon} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 font-medium">
            {patient.name}
            {patient.deceasedAt && <Badge>Óbito</Badge>}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            <span className="font-mono text-xs">Nº {formatRecordCode(patient.code)}</span> · {details}
          </p>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Link>
    </li>
  )
}

type PatientAvatarProps = {
  species: Patient['species']
  muted?: boolean
  icon?: (typeof SPECIES_ICONS)[keyof typeof SPECIES_ICONS]
  size?: 'md' | 'lg'
}

export function PatientAvatar({ species, muted, icon, size = 'md' }: PatientAvatarProps) {
  const Icon = icon ?? SPECIES_ICONS[species]
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full ${
        size === 'lg' ? 'size-14' : 'size-10'
      } ${muted ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}
    >
      <Icon className={size === 'lg' ? 'size-7' : 'size-5'} />
    </span>
  )
}
