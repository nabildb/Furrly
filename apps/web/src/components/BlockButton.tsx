import { useState } from 'react'
import { api } from '../lib/api'
import { cx } from '../lib/cx'

interface BlockButtonProps {
  username: string
  blockedByMe: boolean
  onChange: (blockedByMe: boolean) => void
  className?: string
}

/** Bloquear / desbloquear a un usuario. Bloquear pide confirmación; desbloquear no. */
export function BlockButton({ username, blockedByMe, onChange, className }: BlockButtonProps) {
  const [busy, setBusy] = useState(false)

  async function toggle() {
    if (
      !blockedByMe &&
      !confirm(`¿Bloquear a @${username}? No podrá escribirte ni comentar, dar like o seguir a tus mascotas, y dejarás de recibir sus avisos.`)
    ) {
      return
    }
    setBusy(true)
    try {
      const res = await api<{ blockedByMe: boolean }>(`/users/${username}/block`, { method: blockedByMe ? 'DELETE' : 'PUT' })
      onChange(res.blockedByMe)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={cx('text-[13px] font-extrabold text-muted hover:text-danger disabled:opacity-50', className)}
    >
      {blockedByMe ? 'Desbloquear' : 'Bloquear'}
    </button>
  )
}
