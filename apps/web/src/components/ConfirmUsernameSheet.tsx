import { useState, type FormEvent, type ReactNode } from 'react'
import { ErrorText, Field } from './Field'
import { Button } from './ui/Button'
import { Sheet } from './ui/Sheet'

/**
 * Lo que escribe para confirmar, sin lo que mete el teclado del móvil: mayúscula inicial,
 * espacios del autocorrector o una @ delante.
 */
const normalizeUsername = (text: string) => text.trim().replace(/^@/, '').toLowerCase()

interface ConfirmUsernameSheetProps {
  title: string
  username: string
  deleting: boolean
  error: string | null
  onConfirm: () => void
  onClose: () => void
  /** Lo que se va a borrar, antes de pedir el nombre. */
  children?: ReactNode
}

/** Confirmación de un borrado que no se puede deshacer: hay que escribir el nombre de usuario de la cuenta. */
export function ConfirmUsernameSheet({ title, username, deleting, error, onConfirm, onClose, children }: ConfirmUsernameSheetProps) {
  const [typed, setTyped] = useState('')
  const confirmed = normalizeUsername(typed) === username

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (confirmed) onConfirm()
  }

  return (
    <Sheet title={title} onClose={() => !deleting && onClose()}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {children}
        <p className="text-[15px] font-semibold text-body">
          Para confirmar, escribe el nombre de usuario: <strong className="font-extrabold">{username}</strong>
        </p>
        <Field
          label="Nombre de usuario"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder={username}
        />
        {typed.trim() !== '' && !confirmed && (
          <p className="text-sm font-semibold text-muted">No coincide con el nombre de usuario ({username}).</p>
        )}
        {error && <ErrorText>{error}</ErrorText>}
        <Button type="submit" variant="primary" disabled={!confirmed || deleting} className="w-full">
          {deleting ? 'Borrando…' : 'Borrar definitivamente'}
        </Button>
      </form>
    </Sheet>
  )
}
