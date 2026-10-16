import { Link, Outlet } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { supabase } from '../lib/supabase'

export function Layout() {
  const { session } = useAuth()

  return (
    <div className="mx-auto max-w-2xl p-6">
      <header className="mb-8 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold">
          Furrly
        </Link>
        <nav className="flex gap-4 text-sm">
          {session ? (
            <>
              <Link to="/mascotas" className="underline">
                Mis mascotas
              </Link>
              <button onClick={() => supabase.auth.signOut()} className="underline">
                Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="underline">
                Entrar
              </Link>
              <Link to="/registro" className="underline">
                Crear cuenta
              </Link>
            </>
          )}
        </nav>
      </header>
      <Outlet />
    </div>
  )
}
