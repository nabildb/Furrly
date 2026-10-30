import { useState } from 'react'
import { removeContent, type RemovableType } from '../lib/moderation'
import { DecisionSheet } from './DecisionSheet'
import { Button } from './ui/Button'
import { TrashIcon } from './ui/icons'
import { iconButtonClass } from './ui/styles'

interface ModeratorDeleteButtonProps {
  type: RemovableType
  id: string
  label: string
  /** Se muestra antes de borrar: dice de quién es y qué más se borra. */
  question: string
  /** Papelera redonda, botón con texto o enlace pequeño junto a un comentario. */
  look?: 'icon' | 'button' | 'link'
  onDeleted: () => void
}

/** Borrar como moderador, sin esperar a una denuncia. Quien lo pinta comprueba antes que se es moderador. */
export function ModeratorDeleteButton({ type, id, label, question, look = 'button', onDeleted }: ModeratorDeleteButtonProps) {
  const [open, setOpen] = useState(false)
  const show = () => setOpen(true)

  return (
    <>
      {look === 'icon' && (
        <button type="button" onClick={show} aria-label={label} className={iconButtonClass('text-danger')}>
          <TrashIcon size={20} />
        </button>
      )}
      {look === 'link' && (
        <button type="button" onClick={show} aria-label={label} className="rounded-lg px-2 py-1 text-xs font-extrabold text-danger hover:bg-lost-soft">
          Borrar
        </button>
      )}
      {look === 'button' && (
        <Button variant="danger" size="md" onClick={show}>
          {label}
        </Button>
      )}
      {open && (
        <DecisionSheet
          title={label}
          confirmLabel="Borrar"
          onConfirm={(decision) => removeContent(type, id, decision).then(onDeleted)}
          onClose={() => setOpen(false)}
        >
          <p className="text-[15px] font-semibold text-body">{question}</p>
        </DecisionSheet>
      )}
    </>
  )
}
