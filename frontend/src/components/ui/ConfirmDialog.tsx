import { useState } from 'react'
import { ApiError } from '../../lib/api'
import { Alert } from './Alert'
import { Button } from './Button'
import { Dialog } from './Dialog'

type ConfirmDialogProps = {
  open: boolean
  onClose: () => void
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => Promise<unknown>
}

/** Pede confirmação antes de uma ação destrutiva e mostra o erro da API, se houver. */
export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  onConfirm,
}: ConfirmDialogProps) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const close = () => {
    setError(null)
    onClose()
  }

  async function confirm() {
    setPending(true)
    setError(null)
    try {
      await onConfirm()
      close()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível concluir a ação.')
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onClose={close} title={title} description={description}>
      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={close}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={confirm} loading={pending}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  )
}
