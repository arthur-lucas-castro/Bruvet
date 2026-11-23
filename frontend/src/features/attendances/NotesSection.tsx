import { useState, type FormEvent } from 'react'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { DictationTextarea } from '../../components/ui/DictationTextarea'
import { ApiError } from '../../lib/api'
import { ROLE_LABELS } from '../auth/auth-api'
import { useAddNote, type AttendanceDetail } from './attendances-api'

const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

/** Evolução do atendimento: anotações em ordem cronológica, que não podem ser editadas. */
export function NotesSection({ attendance, canWrite }: { attendance: AttendanceDetail; canWrite: boolean }) {
  const addNote = useAddNote(attendance.id)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const isAddendum = attendance.status === 'finalizado'
  const finishedAt = attendance.finishedAt ? new Date(attendance.finishedAt) : null

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!text.trim()) return
    setError(null)
    try {
      await addNote.mutateAsync(text.trim())
      setText('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar a anotação.')
    }
  }

  return (
    <Card title="Evolução e anotações">
      <div className="space-y-4">
        {attendance.notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma anotação ainda.</p>
        ) : (
          <ol className="space-y-3">
            {attendance.notes.map((note) => {
              const addendum = finishedAt && new Date(note.createdAt) > finishedAt
              return (
                <li key={note.id} className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs text-muted-foreground">
                    <span>
                      <span className="font-semibold text-foreground">{note.author.name}</span> ·{' '}
                      {ROLE_LABELS[note.author.role]}
                      {addendum && <span className="ml-1.5 font-semibold text-accent">Adendo</span>}
                    </span>
                    <time dateTime={note.createdAt} className="font-mono">
                      {dateTime.format(new Date(note.createdAt))}
                    </time>
                  </p>
                  <p className="mt-1.5 whitespace-pre-line text-sm">{note.text}</p>
                </li>
              )
            })}
          </ol>
        )}

        {canWrite && attendance.status !== 'cancelado' && (
          <form onSubmit={submit} className="space-y-2">
            {error && <Alert>{error}</Alert>}
            <DictationTextarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              aria-label={isAddendum ? 'Novo adendo' : 'Nova anotação'}
              placeholder={
                isAddendum
                  ? 'Adendo ao atendimento finalizado (ex.: contato posterior com o tutor)'
                  : 'Evolução, intercorrências, orientações dadas ao tutor…'
              }
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">Anotações não podem ser editadas depois de salvas.</p>
              <Button type="submit" loading={addNote.isPending} disabled={!text.trim()} variant="secondary">
                {isAddendum ? 'Adicionar adendo' : 'Adicionar anotação'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Card>
  )
}
