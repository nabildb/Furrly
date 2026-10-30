import { useState } from 'react'
import { readDecision, removeProfile } from '../lib/moderation'
import { ConfirmUsernameSheet } from './ConfirmUsernameSheet'
import { DecisionFields } from './DecisionFields'

/** Borrar una cuenta y todo lo suyo desde su perfil. Solo para moderadores. */
export function DeleteProfileButton({ username, onDeleted }: { username: string; onDeleted: () => void }) {
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function remove(form: FormData) {
    setDeleting(true)
    setError(null)
    try {
      await removeProfile(username, readDecision(form))
      onDeleted()
    } catch (e) {
      setError((e as Error).message)
      setDeleting(false)
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-[13px] font-extrabold text-danger hover:underline">
        Borrar perfil
      </button>
      {open && (
        <ConfirmUsernameSheet
          title={`Borrar a @${username}`}
          username={username}
          deleting={deleting}
          error={error}
          onConfirm={remove}
          onClose={() => setOpen(false)}
        >
          <p className="text-[15px] font-semibold text-body">
            Se borrarán su cuenta, sus mascotas, avisos, publicaciones, comentarios y mensajes. No se puede deshacer.
          </p>
          <p className="text-sm font-semibold text-muted">
            Podría volver a registrarse con el mismo email. Si quieres impedirlo, suspende la cuenta en vez de borrarla.
          </p>
          <DecisionFields />
        </ConfirmUsernameSheet>
      )}
    </>
  )
}
