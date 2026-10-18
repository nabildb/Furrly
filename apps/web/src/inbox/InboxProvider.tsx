import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/useAuth'
import { api } from '../lib/api'
import type { InboxCounts } from '../lib/inbox'
import { connectRealtime, useRing } from '../lib/realtime'
import { InboxContext } from './InboxContext'

// Red de seguridad: lo normal es enterarse al momento por el timbre de tiempo real.
const POLL_MS = 60_000
const EMPTY: InboxCounts = { notifications: 0, messages: 0 }

/**
 * Contadores de notificaciones y mensajes sin leer para los globos de la navegación. Se actualizan
 * al momento cuando la API toca el timbre (Supabase Realtime, ver lib/realtime.ts), y además cada
 * minuto y al volver a la pestaña, por si se corta la conexión. Aquí también se abre el canal.
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

  // Un canal por sesión: se abre al entrar y se cierra al salir (o al cambiar de cuenta).
  const userId = session?.user.id
  const accessToken = session?.access_token
  useEffect(() => {
    if (!userId || !accessToken) return
    // Al renovarse el token (cada hora) se reconecta con el nuevo.
    return connectRealtime(userId, accessToken)
  }, [userId, accessToken])
  useRing(refresh)

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
