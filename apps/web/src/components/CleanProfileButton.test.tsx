import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../lib/api'
import { renderRoutes } from '../test/render'
import { CleanProfileButton } from './CleanProfileButton'

vi.mock('../lib/api', () => ({ api: vi.fn() }))

const onDone = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
})

describe('limpiar un perfil', () => {
  it('envía solo lo elegido y avisa del nombre que queda', async () => {
    vi.mocked(api).mockResolvedValue({ username: 'usuario_abc' })
    renderRoutes(<Route path="/" element={<CleanProfileButton username="troll" onDone={onDone} />} />)

    await userEvent.click(screen.getByRole('button', { name: 'Limpiar perfil' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Biografía' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Nombre de usuario' }))
    const dialog = screen.getByRole('dialog', { name: 'Limpiar el perfil de @troll' })
    await userEvent.click(dialog.querySelector('button[type=submit]')!)

    expect(api).toHaveBeenCalledWith('/admin/users/troll/clean', {
      method: 'POST',
      body: JSON.stringify({ reason: 'spam', note: null, fields: ['bio', 'username'] }),
    })
    await waitFor(() => expect(onDone).toHaveBeenCalledWith('usuario_abc'))
  })
})
