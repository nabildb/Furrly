import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handleStaleChunk } from './staleChunk'

describe('versión vieja de la web', () => {
  beforeEach(() => sessionStorage.clear())

  it('recarga y evita que el error siga', () => {
    const event = new Event('vite:preloadError', { cancelable: true })
    const reload = vi.fn()

    handleStaleChunk(event, reload)

    expect(reload).toHaveBeenCalledOnce()
    expect(event.defaultPrevented).toBe(true)
  })

  it('no recarga en bucle: la segunda vez deja pasar el error', () => {
    const reload = vi.fn()
    handleStaleChunk(new Event('vite:preloadError', { cancelable: true }), reload)

    const second = new Event('vite:preloadError', { cancelable: true })
    handleStaleChunk(second, reload)

    expect(reload).toHaveBeenCalledOnce()
    expect(second.defaultPrevented).toBe(false)
  })
})
