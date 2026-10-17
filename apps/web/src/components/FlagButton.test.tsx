import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { api } from '../lib/api'
import { renderRoutes } from '../test/render'
import { FlagButton } from './FlagButton'

vi.mock('../lib/api', () => ({ api: vi.fn() }))

const route = <Route path="/" element={<FlagButton target={{ targetType: 'post', targetId: 'p1' }} />} />

describe('denunciar', () => {
  it('envía el motivo elegido y da las gracias', async () => {
    vi.mocked(api).mockResolvedValue({ ok: true })
    renderRoutes(route)

    await userEvent.click(screen.getByRole('button', { name: 'Denunciar' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Es falso o engañoso' }))
    await userEvent.type(screen.getByRole('textbox', { name: /Detalles/ }), 'Foto robada')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar denuncia' }))

    expect(api).toHaveBeenCalledWith('/flags', {
      method: 'POST',
      body: JSON.stringify({ targetType: 'post', targetId: 'p1', reason: 'fake', details: 'Foto robada' }),
    })
    expect(await screen.findByText(/Gracias por avisar/)).toBeInTheDocument()
  })

  it('sin sesión es un enlace al login', () => {
    renderRoutes(route, { session: null })
    expect(screen.getByRole('link', { name: 'Denunciar' })).toHaveAttribute('href', '/login')
  })
})
