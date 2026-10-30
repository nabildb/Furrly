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
    element={<ModeratorDeleteButton type="post" id="p1" label="Borrar publicación" question="¿Borrar?" icon onDeleted={onDeleted} />}
  />
)

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})

describe('borrar como moderador', () => {
  it('pregunta, borra por la ruta de moderación y avisa a la página', async () => {
    vi.mocked(api).mockResolvedValue(null)
    renderRoutes(route)

    await userEvent.click(screen.getByRole('button', { name: 'Borrar publicación' }))
    expect(window.confirm).toHaveBeenCalledWith('¿Borrar?')
    expect(api).toHaveBeenCalledWith('/admin/content/post/p1', { method: 'DELETE' })
    await waitFor(() => expect(onDeleted).toHaveBeenCalled())
  })

  it('si se cancela la pregunta no se borra nada', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderRoutes(route)

    await userEvent.click(screen.getByRole('button', { name: 'Borrar publicación' }))
    expect(api).not.toHaveBeenCalled()
    expect(onDeleted).not.toHaveBeenCalled()
  })

  it('si falla enseña el error y se puede reintentar', async () => {
    vi.mocked(api).mockRejectedValue(new Error('Solo para moderadores'))
    renderRoutes(route)

    await userEvent.click(screen.getByRole('button', { name: 'Borrar publicación' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Solo para moderadores')
    expect(onDeleted).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Borrar publicación' })).toBeEnabled()
  })
})
