import type { Session } from '@supabase/supabase-js'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Sidebar } from '../components/ui/Sidebar'
import { api } from '../lib/api'
import { AuthContext } from './AuthContext'
import { MeProvider } from './MeProvider'
import { useMe } from './useMe'

vi.mock('../lib/api', () => ({ api: vi.fn() }))

/** Cuenta de Google: el token no lleva username y su nombre es el de Google. */
const googleSession = {
  access_token: 'token-de-prueba',
  user: { id: 'u-google', user_metadata: { full_name: 'Nabil D' } },
} as unknown as Session

/** Lo que haría la página de perfil al guardar un nombre nuevo. */
function RenameButton() {
  const { update } = useMe()
  return (
    <button type="button" onClick={() => update({ displayName: 'Nabil Nuevo' })}>
      Guardar nombre
    </button>
  )
}

function renderSidebar(session: Session) {
  render(
    <AuthContext value={{ session, loading: false }}>
      <MeProvider>
        <MemoryRouter>
          <Sidebar />
          <RenameButton />
        </MemoryRouter>
      </MeProvider>
    </AuthContext>,
  )
}

beforeEach(() => {
  vi.mocked(api).mockImplementation(async (path: string) => {
    if (path === '/me') return { username: 'nabil_d', displayName: 'Nabil Daiday' }
    throw new Error(`Petición no esperada: ${path}`)
  })
})

describe('quién soy (MeProvider)', () => {
  it('la barra lateral usa el nombre y el username de la API, no los del token', async () => {
    renderSidebar(googleSession)
    expect(await screen.findByText('Nabil Daiday')).toBeInTheDocument()
    expect(screen.getByText('@nabil_d')).toBeInTheDocument()
  })

  it('cambia al momento cuando se guarda un nombre nuevo', async () => {
    renderSidebar(googleSession)
    await screen.findByText('Nabil Daiday')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar nombre' }))
    expect(screen.getByText('Nabil Nuevo')).toBeInTheDocument()
    expect(screen.queryByText('Nabil Daiday')).not.toBeInTheDocument()
  })

  it('mientras llega /me usa lo que dice el token', async () => {
    vi.mocked(api).mockReturnValue(new Promise(() => {}))
    const session = { access_token: 't', user: { id: 'u1', user_metadata: { username: 'nabil', display_name: 'Nabil' } } } as unknown as Session
    renderSidebar(session)
    expect(screen.getByText('Nabil')).toBeInTheDocument()
    expect(screen.getByText('@nabil')).toBeInTheDocument()
  })

  it('la barra lateral solo enseña Moderación a los moderadores', async () => {
    vi.mocked(api).mockResolvedValue({ username: 'nabil_d', displayName: 'Nabil Daiday', isAdmin: true })
    renderSidebar(googleSession)
    expect(await screen.findByRole('link', { name: 'Moderación' })).toHaveAttribute('href', '/moderacion')
  })

  it('una cuenta normal no ve Moderación', async () => {
    vi.mocked(api).mockResolvedValue({ username: 'nabil_d', displayName: 'Nabil Daiday', isAdmin: false })
    renderSidebar(googleSession)
    await screen.findByText('Nabil Daiday')
    expect(screen.queryByRole('link', { name: 'Moderación' })).not.toBeInTheDocument()
  })
})
