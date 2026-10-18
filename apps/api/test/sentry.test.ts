import supertest from 'supertest'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'

// Solo en este archivo hay DSN: Sentry se simula para comprobar qué se le envía (nunca sale a internet).
// El setup ya cargó la configuración sin DSN: se vuelven a cargar los módulos para que la lea de nuevo.
vi.resetModules()
vi.stubEnv('SENTRY_DSN', 'https://clave@o1.ingest.de.sentry.io/1')
const sentry = vi.hoisted(() => ({ init: vi.fn(), captureException: vi.fn(), flush: vi.fn(async () => true) }))
vi.mock('@sentry/node', () => sentry)

const { app } = await import('../src/app.js')
const { prisma } = await import('../src/lib/prisma.js')
const request = supertest(app)

afterEach(() => {
  vi.restoreAllMocks()
})
afterAll(async () => {
  await prisma.$disconnect()
})

describe('errores en Sentry', () => {
  it('un error inesperado se envía con la ruta (sin ids) y el usuario recibe un 500 genérico', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockRejectedValueOnce(new Error('La base de datos no responde'))

    const res = await request.get('/usernames/nabil/available')
    expect(res.status).toBe(500)
    expect(res.body).toEqual({ error: 'Error interno del servidor' })
    expect(sentry.captureException).toHaveBeenCalledWith(expect.objectContaining({ message: 'La base de datos no responde' }), {
      tags: { method: 'GET', route: '/usernames/:username/available' },
    })
    expect(sentry.flush).toHaveBeenCalled()
    expect(sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({ dataCollection: expect.objectContaining({ userInfo: false, httpBodies: [], databaseQueryData: false }) }),
    )
  })

  it('los errores de quien hace la petición (400, 404) no se envían', async () => {
    sentry.captureException.mockClear()
    expect((await request.get('/usernames/A B/available')).status).toBe(400)
    expect((await request.get('/no-existe')).status).toBe(404)
    expect(sentry.captureException).not.toHaveBeenCalled()
  })
})
