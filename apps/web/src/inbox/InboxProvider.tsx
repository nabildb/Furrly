import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/useAuth'
import { api } from '../lib/api'
import type { InboxCounts } from '../lib/inbox'
import { InboxContext } from './InboxContext'

const POLL_MS = 30_000
const EMPTY: InboxCounts = { notifications: 0, messages: 0 }

/**
 * Contadores de notificaciones y mensajes sin leer para los globos de la navegación.
 * Se consultan cada 30 s y al volver a la pestaña. No usamos Supabase Realtime porque las tablas
 * tienen RLS sin políticas (todo pasa por la API), y para este volumen el polling basta.
 */
export function InboxProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const [counts, setCounts] = useState<InboxCounts>(EMPTY)

  const refresh = useCallback(() => {
    if (!session) return
    api<InboxCounts>('/me/inbox')
      .then(setCounts)
      .catch(() => {})
  }, [session])

  useEffect(() => {
    if (!session) return
    refresh()
    const timer = setInterval(refresh, POLL_MS)
    const onVisible = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [session, refresh])

  // Sin sesión no hay nada que contar (sin setState en el efecto: se deriva aquí).
  const value = session ? { ...counts, refresh } : { ...EMPTY, refresh }
  return <InboxContext value={value}>{children}</InboxContext>
}
