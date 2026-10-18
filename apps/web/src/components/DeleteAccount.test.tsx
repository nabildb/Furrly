import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { api } from '../lib/api'
import { removeUserFolder } from '../lib/storage'
import { renderRoutes } from '../test/render'
import { DeleteAccount } from './DeleteAccount'

vi.mock('../lib/api', () => ({ api: vi.fn() }))
vi.mock('../lib/storage', () => ({ removeUserFolder: vi.fn() }))
vi.mock('../lib/push', () => ({ disablePush: vi.fn() }))
vi.mock('../lib/supabase', () => ({ supabase: { auth: { signOut: vi.fn() } } }))

describe('borrar la cuenta', () => {
  it('acepta el nombre de usuario como lo escribe el teclado del móvil (mayúscula, espacio, @)', async () => {
    vi.mocked(api).mockResolvedValue(null)
    renderRoutes(<Route path="/" element={<DeleteAccount username="nabil" />} />)

    await userEvent.click(screen.getByRole('button', { name: /Borrar mi cuenta/ }))
    const confirm = screen.getByRole('button', { name: 'Borrar definitivamente' })
    const box = screen.getByRole('textbox', { name: 'Nombre de usuario' })

    await userEvent.type(box, 'Otro')
    expect(confirm).toBeDisabled()
    expect(screen.getByText(/No coincide/)).toBeInTheDocument()

    await userEvent.clear(box)
    await userEvent.type(box, '@Nabil ')
    expect(confirm).toBeEnabled()
    await userEvent.click(confirm)

    expect(removeUserFolder).toHaveBeenCalledWith('u-nabil')
    expect(api).toHaveBeenCalledWith('/me', { method: 'DELETE' })
  })
})
