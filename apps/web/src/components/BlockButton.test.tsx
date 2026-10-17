import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { api } from '../lib/api'
import { BlockButton } from './BlockButton'

vi.mock('../lib/api', () => ({ api: vi.fn() }))

describe('bloquear', () => {
  it('pide confirmación antes de bloquear y no hace nada si se cancela', async () => {
    const onChange = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    vi.mocked(api).mockResolvedValue({ blockedByMe: true })
    render(<BlockButton username="pesado" blockedByMe={false} onChange={onChange} />)

    await userEvent.click(screen.getByRole('button', { name: 'Bloquear' }))
    expect(api).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Bloquear' }))
    expect(api).toHaveBeenCalledWith('/users/pesado/block', { method: 'PUT' })
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(true))
  })

  it('desbloquear no pide confirmación', async () => {
    const onChange = vi.fn()
    const confirm = vi.spyOn(window, 'confirm')
    vi.mocked(api).mockResolvedValue({ blockedByMe: false })
    render(<BlockButton username="pesado" blockedByMe onChange={onChange} />)

    await userEvent.click(screen.getByRole('button', { name: 'Desbloquear' }))
    expect(confirm).not.toHaveBeenCalled()
    expect(api).toHaveBeenCalledWith('/users/pesado/block', { method: 'DELETE' })
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(false))
  })
})
