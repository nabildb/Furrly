import { useState } from 'react'
import { api } from '../lib/api'
import type { Decision } from '../lib/moderation'
import { DecisionSheet } from './DecisionSheet'

/** Advertir a alguien desde su perfil: recibe un aviso con el motivo. Solo para moderadores. */
export function WarnButton({ username }: { username: string }) {
  const [open, setOpen] = useState(false)
  const [sent, setSent] = useState(false)

  async function warn(decision: Decision) {
    await api(`/admin/users/${username}/warn`, { method: 'POST', body: JSON.stringify(decision) })
    setSent(true)
    setOpen(false)
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} disabled={sent} className="text-[13px] font-extrabold text-muted hover:text-ink disabled:opacity-60">
        {sent ? 'Advertencia enviada' : 'Advertir'}
      </button>
      {open && (
        <DecisionSheet title={`Advertir a @${username}`} confirmLabel="Enviar advertencia" onConfirm={warn} onClose={() => setOpen(false)}>
          <p className="text-[15px] font-semibold text-body">Recibirá un aviso con el motivo, sin más consecuencias. Quedará en el historial.</p>
        </DecisionSheet>
      )}
    </>
  )
}
