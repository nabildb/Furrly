import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ChatComposer } from './Chat'

describe('caja de mensajes', () => {
  it('Enter envía el texto sin espacios sobrantes y vacía la caja; Mayús+Enter hace salto de línea', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined)
    render(<ChatComposer onSend={onSend} />)
    const box = screen.getByRole('textbox', { name: 'Mensaje' })

    await userEvent.type(box, '  Hola{Shift>}{Enter}{/Shift}¿la has visto?  ')
    expect(onSend).not.toHaveBeenCalled()

    await userEvent.type(box, '{Enter}')
    expect(onSend).toHaveBeenCalledWith('Hola\n¿la has visto?')
    await waitFor(() => expect(box).toHaveValue(''))
  })

  it('no se puede enviar un mensaje vacío', async () => {
    const onSend = vi.fn()
    render(<ChatComposer onSend={onSend} />)
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled()
    await userEvent.type(screen.getByRole('textbox', { name: 'Mensaje' }), '   {Enter}')
    expect(onSend).not.toHaveBeenCalled()
  })
})
