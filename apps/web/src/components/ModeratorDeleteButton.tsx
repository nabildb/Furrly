import { useState } from 'react'
import { cx } from '../lib/cx'
import { removeContent, type RemovableType } from '../lib/moderation'
import { ErrorText } from './Field'
import { Button } from './ui/Button'
import { TrashIcon } from './ui/icons'
import { iconButtonClass } from './ui/styles'

interface ModeratorDeleteButtonProps {
  type: RemovableType
  id: string
  label: string
  /** Se pregunta antes de borrar: dice de quién es y qué más se borra. */
  question: string
  /** Papelera redonda (cabecera de una publicación) en vez de botón con texto. */
  icon?: boolean
  onDeleted: () => void
}

/** Borrar como moderador, sin esperar a una denuncia. Quien lo pinta comprueba antes que se es moderador. */
export function ModeratorDeleteButton({ type, id, label, question, icon, onDeleted }: ModeratorDeleteButtonProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function remove() {
    if (!confirm(question)) return
    setBusy(true)
    setError(null)
    try {
      await removeContent(type, id)
      onDeleted()
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <div className={cx('flex flex-col gap-1', icon ? 'flex-none items-end' : 'items-start')}>
      {icon ? (
        <button type="button" onClick={remove} disabled={busy} aria-label={label} className={iconButtonClass('text-danger')}>
          <TrashIcon size={20} />
        </button>
      ) : (
        <Button variant="danger" size="md" onClick={remove} disabled={busy}>
          {label}
        </Button>
      )}
      {error && <ErrorText>{error}</ErrorText>}
    </div>
  )
}
