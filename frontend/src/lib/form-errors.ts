import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { ApiError } from './api'

/**
 * Coloca os erros de validação devolvidos pela API nos campos do formulário.
 * Retorna a mensagem geral para exibir no topo (ou null se só havia erros de campo).
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): string | null {
  if (!(error instanceof ApiError)) return 'Algo deu errado. Tente novamente.'

  if (error.issues) {
    let applied = false
    for (const [field, messages] of Object.entries(error.issues)) {
      if (messages?.[0]) {
        setError(field as Path<T>, { type: 'server', message: messages[0] })
        applied = true
      }
    }
    if (applied) return null
  }

  return error.message
}
