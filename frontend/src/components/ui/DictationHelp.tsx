import { Mic } from 'lucide-react'
import { AVAILABILITY_MESSAGES, dictationAvailability } from '../../lib/dictation/use-dictation'
import { VOICE_COMMAND_HELP } from '../../lib/dictation/voice-commands'

/** Explica o ditado por voz e lista os comandos de pontuação. */
export function DictationHelp() {
  const availability = dictationAvailability()

  return (
    <details className="rounded-lg border border-border bg-muted/30 text-sm print:hidden">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-3 font-medium">
        <Mic className="size-4 text-primary" aria-hidden="true" />
        Ditado por voz
        {availability !== 'available' && <span className="font-normal text-muted-foreground">— indisponível</span>}
      </summary>
      <div className="space-y-2 border-t border-border px-3 py-3">
        {availability !== 'available' ? (
          <p className="text-destructive">{AVAILABILITY_MESSAGES[availability]}</p>
        ) : (
          <p className="text-muted-foreground">
            Clique no microfone de um campo e fale. O texto entra onde está o cursor. Para pontuar, diga:
          </p>
        )}
        <ul className="flex flex-wrap gap-1.5">
          {VOICE_COMMAND_HELP.map(([spoken, symbol]) => (
            <li key={spoken} className="rounded-md border border-border bg-card px-2 py-0.5 text-xs">
              “{spoken}” <span className="font-mono font-semibold">{symbol}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          Revise o texto antes de salvar: termos técnicos e nomes de medicamentos podem ser transcritos
          errado.
        </p>
      </div>
    </details>
  )
}
