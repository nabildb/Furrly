import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { api } from './api'
import type { Me } from './users'

// Usuarios ya comprobados en esta pestaña: /me se pide una vez por sesión, no en cada página.
const checked = new Set<string>()

export function markUsernameConfirmed(userId: string) {
  checked.add(userId)
}

/**
 * Quien entra por primera vez con Google/Apple tiene un username provisional:
 * se le lleva a /bienvenida para elegirlo antes de seguir, vuelva a la página que vuelva.
 */
export function useUsernameGate() {
  const { session } = useAuth()
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const userId = session?.user.id

  useEffect(() => {
    if (!userId || checked.has(userId) || pathname === '/bienvenida') return
    let cancelled = false
    api<Me>('/me')
      .then((me) => {
        if (me.usernameConfirmed) checked.add(userId)
        else if (!cancelled) navigate(`/bienvenida?next=${encodeURIComponent(pathname + search)}`, { replace: true })
      })
      // Si falla, no se bloquea la navegación: se volverá a comprobar en la siguiente página.
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [userId, pathname, search, navigate])
}
