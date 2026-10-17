import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { api } from '../lib/api'
import { disablePush } from '../lib/push'
import { removeUserFolder } from '../lib/storage'
import { supabase } from '../lib/supabase'
import { ErrorText, Field } from './Field'
import { Button } from './ui/Button'
import { Card, SectionTitle } from './ui/Card'
import { TrashIcon } from './ui/icons'
import { Sheet } from './ui/Sheet'

/** "Zona de peligro" del perfil: borrar la cuenta y todo lo asociado (derecho de supresión del RGPD). */
export function DeleteAccount({ username }: { username: string }) {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete(e: FormEvent) {
    e.preventDefault()
    if (!session || typed !== username) return
    setDeleting(true)
    setError(null)
    try {
      // Primero las fotos: después ya no tendríamos sesión para borrarlas de Storage.
      await removeUserFolder(session.user.id)
      await disablePush().catch(() => {})
      await api('/me', { method: 'DELETE' })
      await supabase.auth.signOut()
      navigate('/avisos', { replace: true })
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
        <Sheet title="Borrar mi cuenta" onClose={() => !deleting && setOpen(false)}>
          <form onSubmit={handleDelete} className="space-y-4">
            <p className="text-[15px] font-semibold text-body">
              Para confirmar, escribe tu nombre de usuario: <strong className="font-extrabold">{username}</strong>
            </p>
            <Field label="Nombre de usuario" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
            {error && <ErrorText>{error}</ErrorText>}
            <Button type="submit" variant="primary" disabled={typed !== username || deleting} className="w-full">
              {deleting ? 'Borrando…' : 'Borrar definitivamente'}
            </Button>
          </form>
        </Sheet>
      )}
    </Card>
  )
}
