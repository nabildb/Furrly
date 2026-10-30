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
  it('suspende a quien no lo está y el botón pasa a readmitir', async () => {
    mockSuspended(['otra'])
    renderRoutes(route)

    await userEvent.click(await screen.findByRole('button', { name: 'Suspender cuenta' }))
    expect(api).toHaveBeenCalledWith('/admin/suspended/troll', { method: 'PUT' })
    expect(await screen.findByRole('button', { name: 'Levantar suspensión' })).toBeInTheDocument()
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

    vi.mocked(api).mockRejectedValue(new Error('No se puede suspender a un moderador'))
    await userEvent.click(button)
    expect(await screen.findByRole('alert')).toHaveTextContent('No se puede suspender a un moderador')
    expect(screen.getByRole('button', { name: 'Suspender cuenta' })).toBeInTheDocument()
  })
})
