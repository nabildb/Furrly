import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { reportError } from '../lib/sentry'
import { ErrorBoundary } from './ErrorBoundary'

vi.mock('../lib/sentry', () => ({ reportError: vi.fn() }))

function Broken(): never {
  throw new Error('fallo al pintar')
}

describe('ErrorBoundary', () => {
  it('muestra una salida en vez de la pantalla en blanco y avisa a Sentry', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('No hemos podido abrir esta pantalla')
    expect(screen.getByRole('button', { name: 'Recargar' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver al mapa' })).toHaveAttribute('href', '/avisos')
    expect(reportError).toHaveBeenCalledOnce()
  })
})
