import supertest from 'supertest'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('rate limiting', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('corta las escrituras con 429 al pasar de 60 en la ventana, sin afectar a las lecturas', async () => {
    // En el resto de tests está desactivado: cargamos una instancia de la app con el límite activo.
    vi.resetModules()
    vi.stubEnv('RATE_LIMIT_ENABLED', 'true')
    const { app } = await import('../src/app.js')
    const request = supertest(app)

    for (let i = 0; i < 60; i++) {
      expect((await request.post('/pets').send({})).status).toBe(401)
    }
    const blocked = await request.post('/pets').send({})
    expect(blocked.status).toBe(429)
    expect(blocked.body.error).toMatch(/Demasiadas peticiones/)
    expect(blocked.headers['ratelimit-policy']).toBeDefined()

    expect((await request.get('/health')).status).toBe(200)
  })
})
