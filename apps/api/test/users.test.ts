import { describe, expect, it } from 'vitest'
import { createPet, createUser, mediaUrl, request, RETIRO } from './helpers.js'

describe('PATCH /me', () => {
  it('actualiza el perfil y la zona de alertas', async () => {
    const user = await createUser('nabil')
    const res = await request
      .patch('/me')
      .set(user.auth)
      .send({ displayName: 'Nabil D.', bio: 'Dueño de Luna', avatarUrl: mediaUrl(user.id), alertLocation: RETIRO, alertRadiusKm: 3 })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ displayName: 'Nabil D.', bio: 'Dueño de Luna', alertRadiusKm: 3 })
    expect(res.body.alertLocation.lat).toBeCloseTo(RETIRO.lat, 6)

    const cleared = await request.patch('/me').set(user.auth).send({ alertLocation: null, bio: '' })
    expect(cleared.body).toMatchObject({ alertLocation: null, bio: null, displayName: 'Nabil D.' })
  })

  it('valida radio, nombre y avatar', async () => {
    const user = await createUser('nabil')
    const other = await createUser('otra')
    expect((await request.patch('/me').set(user.auth).send({ alertRadiusKm: 100 })).status).toBe(400)
    expect((await request.patch('/me').set(user.auth).send({ displayName: '' })).status).toBe(400)
    expect((await request.patch('/me').set(user.auth).send({ avatarUrl: mediaUrl(other.id) })).status).toBe(400)
  })
})

describe('GET /users/:username', () => {
  it('devuelve el perfil público sin la zona de alertas', async () => {
    const user = await createUser('nabil')
    await request.patch('/me').set(user.auth).send({ alertLocation: RETIRO })
    await createPet(user)

    const res = await request.get('/users/Nabil')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ username: 'nabil', petsCount: 1, reportsCount: 0 })
    expect(res.body).not.toHaveProperty('alertLocation')
    expect(res.body).not.toHaveProperty('id')
  })

  it('404 si no existe, y 404 en JSON para rutas desconocidas', async () => {
    expect((await request.get('/users/nadie')).status).toBe(404)
    const unknown = await request.get('/no-existe')
    expect(unknown.status).toBe(404)
    expect(unknown.body.error).toBe('Ruta no encontrada')
  })
})
