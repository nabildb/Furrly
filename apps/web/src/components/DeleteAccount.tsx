import { useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { api } from '../lib/api'
import { disablePush } from '../lib/push'
import { removeUserFolder } from '../lib/storage'
import { supabase } from '../lib/supabase'
import { ConfirmUsernameSheet } from './ConfirmUsernameSheet'
import { Button } from './ui/Button'
import { Card, SectionTitle } from './ui/Card'
import { TrashIcon } from './ui/icons'

/** "Zona de peligro" del perfil: borrar la cuenta y todo lo asociado (derecho de supresión del RGPD). */
export function DeleteAccount({ username }: { username: string }) {
  const { session } = useAuth()
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (!session) return
    setDeleting(true)
    setError(null)
    try {
      // Primero las fotos: después ya no tendríamos sesión para borrarlas de Storage.
      await removeUserFolder(session.user.id)
      await disablePush().catch(() => {})
      await api('/me', { method: 'DELETE' })
      await supabase.auth.signOut()
      // Recarga completa en el mapa: no queda nada de la cuenta en memoria, y el perfil (que exige
      // sesión) no llega a mandarte al login.
      window.location.replace('/avisos')
    } catch (e) {
      setError((e as Error).message)
      setDeleting(false)
    }
  }

  return (
    <Card className="space-y-3 border-lost-soft">
      <SectionTitle>Zona de peligro</SectionTitle>
      <p className="text-sm font-semibold text-muted">
        Borra tu cuenta y todo lo tuyo: mascotas, avisos, publicaciones, mensajes y fotos. No se puede deshacer.
      </p>
      <Button variant="danger" size="md" onClick={() => setOpen(true)} className="w-full">
        <TrashIcon size={20} /> Borrar mi cuenta
      </Button>
      {open && (
        <ConfirmUsernameSheet
          title="Borrar mi cuenta"
          username={username}
          deleting={deleting}
          error={error}
          onConfirm={handleDelete}
          onClose={() => setOpen(false)}
        />
      )}
    </Card>
  )
}
