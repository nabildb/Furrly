import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { disablePush, enablePush, getPushStatus, sendTestPush } from '../lib/push'
import { PushToggle } from './PushToggle'

vi.mock('../lib/push', () => ({ getPushStatus: vi.fn(), enablePush: vi.fn(), disablePush: vi.fn(), sendTestPush: vi.fn() }))

describe('avisos en este dispositivo', () => {
  it('se activan y se desactivan', async () => {
    vi.mocked(getPushStatus).mockResolvedValue('off')
    vi.mocked(enablePush).mockResolvedValue('on')
    render(<PushToggle />)

    await userEvent.click(await screen.findByRole('button', { name: 'Activar avisos' }))
    expect(enablePush).toHaveBeenCalled()
    await userEvent.click(await screen.findByRole('button', { name: /Activados/ }))
    expect(disablePush).toHaveBeenCalled()
    expect(await screen.findByRole('button', { name: 'Activar avisos' })).toBeInTheDocument()
  })

  it('con los avisos activados se puede mandar uno de prueba', async () => {
    vi.mocked(getPushStatus).mockResolvedValue('on')
    vi.mocked(sendTestPush).mockResolvedValue(1)
    render(<PushToggle />)

    await userEvent.click(await screen.findByRole('button', { name: 'Enviar un aviso de prueba' }))
    expect(sendTestPush).toHaveBeenCalled()
    expect(await screen.findByRole('status')).toHaveTextContent('debería llegarte en unos segundos')
  })

  it('en iPhone sin instalar explica cómo hacerlo y no ofrece el botón', async () => {
    vi.mocked(getPushStatus).mockResolvedValue('ios-install')
    render(<PushToggle />)
    expect(await screen.findByText(/Añadir a pantalla de inicio/)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('la versión compacta solo aparece si se pueden activar', async () => {
    vi.mocked(getPushStatus).mockResolvedValue('on')
    const { container } = render(<PushToggle compact />)
    await vi.waitFor(() => expect(getPushStatus).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })
})
