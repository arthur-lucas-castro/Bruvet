import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { Input } from '../../components/ui/Field'
import { LoadingState } from '../../components/ui/States'
import { ApiError } from '../../lib/api'
import {
  useDeleteCategory,
  useProcedureCategories,
  useSaveCategory,
  type ProcedureCategory,
} from './procedures-api'

const iconButton =
  'flex size-11 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40'

const errorMessage = (error: unknown) =>
  error instanceof ApiError
    ? (error.issues?.name?.[0] ?? error.message)
    : 'Não foi possível salvar. Tente novamente.'

type CategoriesDialogProps = { open: boolean; onClose: () => void }

/** Gestão das categorias do catálogo (somente administradores). */
export function CategoriesDialog({ open, onClose }: CategoriesDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Categorias do catálogo"
      description="Categorias com procedimentos não podem ser excluídas."
    >
      <CategoriesManager />
    </Dialog>
  )
}

function CategoriesManager() {
  const { data: categories, isPending } = useProcedureCategories()
  const saveCategory = useSaveCategory()
  const deleteCategory = useDeleteCategory()
  const [newName, setNewName] = useState('')
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function create(event: FormEvent) {
    event.preventDefault()
    if (!newName.trim()) return
    setError(null)
    try {
      await saveCategory.mutateAsync({ name: newName.trim() })
      setNewName('')
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function rename(event: FormEvent) {
    event.preventDefault()
    if (!editing?.name.trim()) return
    setError(null)
    try {
      await saveCategory.mutateAsync({ id: editing.id, name: editing.name.trim() })
      setEditing(null)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function remove(category: ProcedureCategory) {
    setError(null)
    try {
      await deleteCategory.mutateAsync(category.id)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  if (isPending) return <LoadingState />

  return (
    <div className="space-y-4">
      {error && <Alert>{error}</Alert>}

      <ul className="divide-y divide-border rounded-lg border border-border">
        {categories?.map((category) =>
          editing?.id === category.id ? (
            <li key={category.id} className="p-2">
              <form onSubmit={rename} className="flex items-center gap-1">
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  aria-label={`Novo nome para ${category.name}`}
                  autoFocus
                />
                <button type="submit" className={iconButton} aria-label="Salvar nome">
                  <Check className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={iconButton}
                  onClick={() => setEditing(null)}
                  aria-label="Cancelar"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </form>
            </li>
          ) : (
            <li key={category.id} className="flex items-center gap-2 py-1 pl-3 pr-1">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{category.name}</span>
                <span className="text-xs text-muted-foreground">
                  {category._count.procedures === 1
                    ? '1 procedimento'
                    : `${category._count.procedures} procedimentos`}
                </span>
              </span>
              <button
                type="button"
                className={iconButton}
                onClick={() => setEditing({ id: category.id, name: category.name })}
                aria-label={`Renomear ${category.name}`}
                title="Renomear"
              >
                <Pencil className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                className={iconButton}
                onClick={() => remove(category)}
                disabled={category._count.procedures > 0 || deleteCategory.isPending}
                aria-label={`Excluir ${category.name}`}
                title={category._count.procedures > 0 ? 'Categoria com procedimentos' : 'Excluir'}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </li>
          ),
        )}
      </ul>

      <form onSubmit={create} className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nova categoria"
          aria-label="Nome da nova categoria"
        />
        <Button type="submit" loading={saveCategory.isPending && !editing} disabled={!newName.trim()}>
          <Plus className="size-4" aria-hidden="true" />
          Adicionar
        </Button>
      </form>
    </div>
  )
}
