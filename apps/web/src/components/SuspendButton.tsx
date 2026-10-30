import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { SuspendedUser } from '../lib/moderation'
import { ErrorText } from './Field'

/** Suspender o readmitir una cuenta desde su perfil, sin esperar a una denuncia. Solo para moderadores. */
export function SuspendButton({ username }: { username: string }) {
  // null = aún no se sabe: sale de la misma lista que el panel de moderación.
  const [suspended, setSuspended] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<SuspendedUser[]>('/admin/suspended')
      .then((users) => setSuspended(users.some((u) => u.username === username)))
      .catch((e: Error) => setError(e.message))
  }, [username])

  async function toggle() {
    const question = suspended
      ? `¿Levantar la suspensión de @${username}?`
      : `¿Suspender a @${username}? No podrá entrar en Furrly hasta que levantes la suspensión.`
    if (!confirm(question)) return
    setBusy(true)
    setError(null)
    try {
      await api(`/admin/suspended/${username}`, { method: suspended ? 'DELETE' : 'PUT' })
      setSuspended(!suspended)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {suspended !== null && (
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          className="text-[13px] font-extrabold text-danger hover:underline disabled:opacity-50"
        >
          {suspended ? 'Levantar suspensión' : 'Suspender cuenta'}
        </button>
      )}
      {error && <ErrorText>{error}</ErrorText>}
    </>
  )
}
