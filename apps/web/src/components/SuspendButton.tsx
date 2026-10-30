import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { suspensionOptions, type Decision, type SuspendedUser } from '../lib/moderation'
import { DecisionSheet } from './DecisionSheet'
import { ErrorText, SelectField } from './Field'

/** Suspender o readmitir una cuenta desde su perfil, sin esperar a una denuncia. Solo para moderadores. */
export function SuspendButton({ username, onDone }: { username: string; onDone?: () => void }) {
  // null = aún no se sabe: sale de la misma lista que el panel de moderación.
  const [suspended, setSuspended] = useState<boolean | null>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<SuspendedUser[]>('/admin/suspended')
      .then((users) => setSuspended(users.some((u) => u.username === username)))
      .catch((e: Error) => setError(e.message))
  }, [username])

  async function suspend(decision: Decision, form: FormData) {
    await api(`/admin/suspended/${username}`, { method: 'PUT', body: JSON.stringify({ ...decision, days: Number(form.get('days')) || null }) })
    setSuspended(true)
    setOpen(false)
    onDone?.()
  }

  async function lift() {
    if (!confirm(`¿Levantar la suspensión de @${username}?`)) return
    setError(null)
    try {
      await api(`/admin/suspended/${username}`, { method: 'DELETE' })
      setSuspended(false)
      onDone?.()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <>
      {suspended !== null && (
        <button type="button" onClick={suspended ? lift : () => setOpen(true)} className="text-[13px] font-extrabold text-danger hover:underline">
          {suspended ? 'Levantar suspensión' : 'Suspender cuenta'}
        </button>
      )}
      {error && <ErrorText>{error}</ErrorText>}
      {open && (
        <DecisionSheet title={`Suspender a @${username}`} confirmLabel="Suspender" onConfirm={suspend} onClose={() => setOpen(false)}>
          <p className="text-[15px] font-semibold text-body">No podrá entrar en Furrly mientras dure la suspensión.</p>
          <SelectField label="Duración" name="days" options={suspensionOptions} defaultValue="7" />
        </DecisionSheet>
      )}
    </>
  )
}
