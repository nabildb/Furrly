import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { api } from './api'
import type { Me } from './users'

// Usuarios ya comprobados en esta pestaña: /me se pide una vez por sesión, no en cada página.
const ready = new Set<string>()

/** La cuenta ya no tiene nada pendiente (username elegido y guía hecha): no hace falta volver a mirar. */
export function markAccountReady(userId: string) {
  ready.add(userId)
}

/** Páginas que forman parte de lo pendiente: desde ellas no se redirige. */
const SETUP_PAGES = ['/bienvenida', '/empezar']

/**
 * Lo que una cuenta nueva tiene que hacer antes de seguir, vuelva a la página que vuelva:
 * 1. Si entró con Google/Apple, elegir su nombre de usuario (/bienvenida).
 * 2. La guía de primeros pasos: zona de alertas, avisos push y mascota (/empezar).
 */
export function useAccountGate() {
  const { session } = useAuth()
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const userId = session?.user.id

  useEffect(() => {
    if (!userId || ready.has(userId) || SETUP_PAGES.includes(pathname)) return
    let cancelled = false
    const next = encodeURIComponent(pathname + search)
    api<Me>('/me')
      .then((me) => {
        if (cancelled) return
        if (!me.usernameConfirmed) navigate(`/bienvenida?next=${next}`, { replace: true })
        else if (me.onboardingDone === false) navigate(`/empezar?next=${next}`, { replace: true })
        else ready.add(userId)
      })
      // Si falla, no se bloquea la navegación: se volverá a comprobar en la siguiente página.
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [userId, pathname, search, navigate])
}
