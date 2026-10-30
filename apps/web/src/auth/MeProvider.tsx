import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from '../lib/api'
import type { Me } from '../lib/users'
import { MeContext } from './MeContext'
import { useAuth } from './useAuth'

interface Identity {
  userId: string
  username: string
  displayName: string
  isAdmin: boolean
}

/**
 * El username y el nombre visible salen de la API (/me), no del token de Supabase: el token guarda lo
 * que se puso al registrarse y no cambia al editar el perfil, y en las cuentas de Google ni siquiera
 * lleva username (lo crea el trigger y se elige en /bienvenida). Mientras llega /me se usa el token.
 */
export function MeProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const userId = session?.user.id
  const [fromApi, setFromApi] = useState<Identity | null>(null)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    api<Me>('/me')
      .then((me) => !cancelled && setFromApi({ userId, username: me.username, displayName: me.displayName, isAdmin: me.isAdmin }))
      // Sin /me (fallo de red) se queda lo del token: mejor eso que nada.
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [userId])

  const update = useCallback(
    (changes: { username?: string; displayName?: string }) =>
      setFromApi((current) => (current && current.userId === userId ? { ...current, ...changes } : current)),
    [userId],
  )

  const value = useMemo(() => {
    // Los datos de otra cuenta (se cerró sesión y entró otra) no valen.
    if (userId && fromApi?.userId === userId) {
      return { username: fromApi.username, displayName: fromApi.displayName, isAdmin: fromApi.isAdmin, update }
    }
    const metadata = session?.user.user_metadata
    return {
      username: (metadata?.username as string | undefined) ?? null,
      displayName: (metadata?.display_name as string | undefined) ?? null,
      isAdmin: false,
      update,
    }
  }, [userId, fromApi, session, update])

  return <MeContext value={value}>{children}</MeContext>
}
