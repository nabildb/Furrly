import { Navigate, Outlet } from 'react-router'
import { useAuth } from '../auth/useAuth'

/** Rutas que necesitan sesión: si no hay, manda al login. */
export function RequireAuth() {
  const { session, loading } = useAuth()
  if (loading) return <p>Cargando…</p>
  if (!session) return <Navigate to="/login" replace />
  return <Outlet />
}
