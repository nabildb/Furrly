import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { api } from '../lib/api'
import { renderRoutes } from '../test/render'
import { WarnButton } from './WarnButton'

vi.mock('../lib/api', () => ({ api: vi.fn() }))

describe('advertir desde el perfil', () => {
  it('envía el motivo y deja constancia en el botón', async () => {
    vi.mocked(api).mockResolvedValue(null)
    renderRoutes(<Route path="/" element={<WarnButton username="troll" />} />)

    await userEvent.click(screen.getByRole('button', { name: 'Advertir' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Falso o engañoso' }))
    await userEvent.click(screen.getByRole('button', { name: 'Enviar advertencia' }))

    expect(api).toHaveBeenCalledWith('/admin/users/troll/warn', { method: 'POST', body: JSON.stringify({ reason: 'fake', note: null }) })
    expect(await screen.findByRole('button', { name: 'Advertencia enviada' })).toBeDisabled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
