import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../lib/api'
import { renderRoutes } from '../test/render'
import { ModeratorDeleteButton } from './ModeratorDeleteButton'

vi.mock('../lib/api', () => ({ api: vi.fn() }))

const onDeleted = vi.fn()
const route = (
  <Route
    path="/"
    element={<ModeratorDeleteButton type="post" id="p1" label="Borrar publicación" question="¿Borrar esta publicación?" look="icon" onDeleted={onDeleted} />}
  />
)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('borrar como moderador', () => {
  it('pide el motivo, borra por la ruta de moderación y avisa a la página', async () => {
    vi.mocked(api).mockResolvedValue(null)
    renderRoutes(route)

    await userEvent.click(screen.getByRole('button', { name: 'Borrar publicación' }))
    expect(screen.getByRole('dialog', { name: 'Borrar publicación' })).toHaveTextContent('¿Borrar esta publicación?')

    await userEvent.click(screen.getByRole('radio', { name: 'Falso o engañoso' }))
    await userEvent.type(screen.getByRole('textbox', { name: /Nota interna/ }), 'Foto robada')
    await userEvent.click(screen.getByRole('button', { name: 'Borrar' }))

    expect(api).toHaveBeenCalledWith('/admin/content/post/p1', {
      method: 'DELETE',
      body: JSON.stringify({ reason: 'fake', note: 'Foto robada' }),
    })
    await waitFor(() => expect(onDeleted).toHaveBeenCalled())
  })

  it('si se cierra la hoja no se borra nada', async () => {
    renderRoutes(route)

    await userEvent.click(screen.getByRole('button', { name: 'Borrar publicación' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(api).not.toHaveBeenCalled()
  })

  it('si falla enseña el error y se puede reintentar', async () => {
    vi.mocked(api).mockRejectedValue(new Error('Solo para moderadores'))
    renderRoutes(route)

    await userEvent.click(screen.getByRole('button', { name: 'Borrar publicación' }))
    await userEvent.click(screen.getByRole('button', { name: 'Borrar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Solo para moderadores')
    expect(onDeleted).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Borrar' })).toBeEnabled()
  })
})
