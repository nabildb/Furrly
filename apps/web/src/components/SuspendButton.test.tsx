import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../lib/api'
import { renderRoutes } from '../test/render'
import { SuspendButton } from './SuspendButton'

vi.mock('../lib/api', () => ({ api: vi.fn() }))

const route = <Route path="/" element={<SuspendButton username="troll" />} />

function mockSuspended(usernames: string[]) {
  vi.mocked(api).mockImplementation(async (path: string) => (path === '/admin/suspended' ? usernames.map((username) => ({ username })) : null))
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})

describe('suspender desde el perfil', () => {
  it('pide el motivo, suspende y el botón pasa a readmitir', async () => {
    mockSuspended(['otra'])
    renderRoutes(route)

    await userEvent.click(await screen.findByRole('button', { name: 'Suspender cuenta' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Inapropiado u ofensivo' }))
    await userEvent.click(screen.getByRole('button', { name: 'Suspender' }))

    expect(api).toHaveBeenCalledWith('/admin/suspended/troll', { method: 'PUT', body: JSON.stringify({ reason: 'inappropriate', note: null }) })
    expect(await screen.findByRole('button', { name: 'Levantar suspensión' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('a quien ya está suspendido se le puede readmitir', async () => {
    mockSuspended(['troll'])
    renderRoutes(route)

    await userEvent.click(await screen.findByRole('button', { name: 'Levantar suspensión' }))
    expect(api).toHaveBeenCalledWith('/admin/suspended/troll', { method: 'DELETE' })
    expect(await screen.findByRole('button', { name: 'Suspender cuenta' })).toBeInTheDocument()
  })

  it('si la API lo rechaza enseña el motivo', async () => {
    mockSuspended([])
    renderRoutes(route)
    const button = await screen.findByRole('button', { name: 'Suspender cuenta' })

    vi.mocked(api).mockRejectedValue(new Error('Eso no se puede hacer con la cuenta de un moderador'))
    await userEvent.click(button)
    await userEvent.click(screen.getByRole('button', { name: 'Suspender' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('la cuenta de un moderador')
  })
})
