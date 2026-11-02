import { removeProfile } from '../lib/moderation'
import { ConfirmedDecisionButton } from './ConfirmedDecisionButton'

/** Borrar una cuenta y todo lo suyo. Solo para moderadores. */
export function DeleteProfileButton({ username, onDeleted }: { username: string; onDeleted: () => void }) {
  return (
    <ConfirmedDecisionButton
      label="Borrar perfil"
      title={`Borrar a @${username}`}
      username={username}
      onConfirm={(decision) => removeProfile(username, decision).then(onDeleted)}
    >
      <p className="text-[15px] font-semibold text-body">
        Se borrarán su cuenta, sus mascotas, avisos, publicaciones, comentarios y mensajes. No se puede deshacer.
      </p>
      <p className="text-sm font-semibold text-muted">
        Podría volver a registrarse con el mismo email. Si quieres impedirlo, suspende la cuenta en vez de borrarla.
      </p>
    </ConfirmedDecisionButton>
  )
}
