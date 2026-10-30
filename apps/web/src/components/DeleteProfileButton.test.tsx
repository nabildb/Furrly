import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../lib/api'
import { renderRoutes } from '../test/render'
import { DeleteProfileButton } from './DeleteProfileButton'

vi.mock('../lib/api', () => ({ api: vi.fn() }))

const onDeleted = vi.fn()
const route = <Route path="/" element={<DeleteProfileButton username="troll" onDeleted={onDeleted} />} />

beforeEach(() => {
  vi.clearAllMocks()
})

describe('borrar un perfil como moderador', () => {
  it('no deja borrar hasta escribir su nombre y avisa de que podría volver', async () => {
    vi.mocked(api).mockResolvedValue(null)
    renderRoutes(route)

    await userEvent.click(screen.getByRole('button', { name: 'Borrar perfil' }))
    expect(screen.getByRole('dialog', { name: 'Borrar a @troll' })).toHaveTextContent('Podría volver a registrarse')

    const confirm = screen.getByRole('button', { name: 'Borrar definitivamente' })
    const box = screen.getByRole('textbox', { name: 'Nombre de usuario' })
    await userEvent.type(box, 'otra')
    expect(confirm).toBeDisabled()

    await userEvent.clear(box)
    await userEvent.type(box, '@Troll ')
    await userEvent.click(confirm)

    expect(api).toHaveBeenCalledWith('/admin/users/troll', { method: 'DELETE' })
    await waitFor(() => expect(onDeleted).toHaveBeenCalled())
  })

  it('si la API lo rechaza enseña el motivo y no da por borrado el perfil', async () => {
    vi.mocked(api).mockRejectedValue(new Error('Eso no se puede hacer con la cuenta de un moderador'))
    renderRoutes(route)

    await userEvent.click(screen.getByRole('button', { name: 'Borrar perfil' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Nombre de usuario' }), 'troll')
    await userEvent.click(screen.getByRole('button', { name: 'Borrar definitivamente' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('la cuenta de un moderador')
    expect(onDeleted).not.toHaveBeenCalled()
  })
})
