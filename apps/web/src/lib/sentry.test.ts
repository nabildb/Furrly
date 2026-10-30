import { beforeEach, describe, expect, it, vi } from 'vitest'

const { init, captureException } = vi.hoisted(() => ({ init: vi.fn(), captureException: vi.fn() }))
vi.mock('@sentry/react', () => ({ init, captureException }))

describe('Sentry bajo demanda', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_SENTRY_DSN', 'https://clave@sentry.test/1')
  })

  it('no se descarga hasta el primer error, y ese error se envía', async () => {
    const { initSentry } = await import('./sentry')
    initSentry()
    await new Promise((resolve) => setTimeout(resolve))
    expect(init).not.toHaveBeenCalled()

    const error = new Error('fallo')
    window.dispatchEvent(new ErrorEvent('error', { error }))

    await vi.waitFor(() => expect(captureException).toHaveBeenCalledWith(error))
    expect(init).toHaveBeenCalledOnce()
  })
})
