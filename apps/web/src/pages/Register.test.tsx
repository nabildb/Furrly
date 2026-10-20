import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../lib/api'
import { supabase } from '../lib/supabase'
import { renderRoutes } from '../test/render'
import { Register } from './Register'

vi.mock('../lib/api', async (original) => ({ ...(await original<typeof import('../lib/api')>()), api: vi.fn() }))
vi.mock('../lib/supabase', () => ({
  supabase: { auth: { signUp: vi.fn(), getSession: async () => ({ data: { session: null } }) } },
}))
vi.mock('../lib/oauth', () => ({ enabledProviders: async () => [], signInWith: vi.fn() }))

const signUp = vi.mocked(supabase.auth.signUp)

function renderRegister() {
  renderRoutes(<Route path="/registro" element={<Register />} />, { path: '/registro', session: null })
  return screen.getByRole('textbox', { name: 'Nombre de usuario' })
}

async function fillRest() {
  await userEvent.type(screen.getByRole('textbox', { name: 'Nombre visible' }), 'Pau')
  await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'pau@example.test')
  await userEvent.type(screen.getByLabelText(/^Contraseña/), 'contrasena123')
}

const submit = () => userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

beforeEach(() => {
  vi.mocked(api).mockResolvedValue({ available: true })
  signUp.mockResolvedValue({ data: { user: null, session: null }, error: null } as never)
})

describe('crear cuenta', () => {
  it('corrige mayúsculas, tildes y espacios del nombre de usuario mientras se escribe', async () => {
    const username = renderRegister()
    await userEvent.type(username, 'José Peña')
    expect(username).toHaveValue('jose_pena')
    await fillRest()
    await submit()

    expect(api).toHaveBeenCalledWith('/usernames/jose_pena/available')
    expect(signUp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'pau@example.test', options: expect.objectContaining({ data: { username: 'jose_pena', display_name: 'Pau' } }) }),
    )
    expect(await screen.findByRole('heading', { name: 'Revisa tu email' })).toBeInTheDocument()
    // Si el email ya tenía cuenta, Supabase no envía nada: la pantalla lo avisa sin revelarlo.
    expect(screen.getByRole('link', { name: 'recupera la contraseña' })).toHaveAttribute('href', '/recuperar')
  })

  it('explica qué sobra en el nombre de usuario y no envía nada', async () => {
    const username = renderRegister()
    await userEvent.type(username, 'pau.mulet')
    expect(username).toHaveAccessibleDescription('No puede llevar «.». Usa letras sin tilde, números o _.')
    expect(username).toBeInvalid()
    await fillRest()
    await submit()

    expect(api).not.toHaveBeenCalled()
    expect(signUp).not.toHaveBeenCalled()
  })

  it('traduce los errores de Supabase', async () => {
    signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: 'over_email_send_rate_limit', status: 429, message: 'email rate limit exceeded' },
    } as never)
    await userEvent.type(renderRegister(), 'pau_mulet')
    await fillRest()
    await submit()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ahora mismo no podemos enviar más emails de confirmación. Prueba dentro de un rato o entra con Google.',
    )
  })

  it('avisa si el nombre de usuario ya está cogido', async () => {
    vi.mocked(api).mockResolvedValue({ available: false })
    await userEvent.type(renderRegister(), 'nabil')
    await fillRest()
    await submit()

    expect(await screen.findByRole('alert')).toHaveTextContent('Ese nombre de usuario ya está cogido.')
    expect(signUp).not.toHaveBeenCalled()
  })
})
