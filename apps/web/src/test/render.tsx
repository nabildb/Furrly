import type { Session } from '@supabase/supabase-js'
import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, Routes } from 'react-router'
import { AuthContext } from '../auth/AuthContext'
import { MeContext } from '../auth/MeContext'

/** Sesión falsa: basta con lo que la web lee de ella (id y username). */
export const fakeSession = {
  access_token: 'token-de-prueba',
  user: { id: 'u-nabil', user_metadata: { username: 'nabil', display_name: 'Nabil' } },
} as unknown as Session

/** Renderiza unas rutas en una URL concreta, con o sin sesión. */
export function renderRoutes(routes: ReactNode, { path = '/', session = fakeSession }: { path?: string; session?: Session | null } = {}) {
  return render(
    <AuthContext value={{ session, loading: false }}>
      {/* Quién soy: el de la sesión falsa (en la web real lo da MeProvider con /me). */}
      <MeContext value={session ? { username: 'nabil', displayName: 'Nabil', update: () => {} } : { username: null, displayName: null, update: () => {} }}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>{routes}</Routes>
        </MemoryRouter>
      </MeContext>
    </AuthContext>,
  )
}
