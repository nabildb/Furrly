import { describe, expect, it } from 'vitest'
import { prisma } from '../src/lib/prisma.js'
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

describe('buscar perfiles', () => {
  const search = async (q: string) => (await request.get('/users').query({ q })).body

  it('busca por username o nombre visible, con el username exacto primero', async () => {
    await createUser('ana')
    await createUser('anabel')
    await createUser('juana')
    await createUser('ana_g')
    const luna = await createUser('duena_de_luna')
    await prisma.user.update({ where: { id: luna.id }, data: { displayName: 'Ana Martín' } })

    const found = (await search('ana')).map((u: { username: string }) => u.username)
    expect(found[0]).toBe('ana')
    expect(found.slice(1, 3).sort()).toEqual(['ana_g', 'anabel'])
    expect(found.slice(3)).toEqual(['duena_de_luna', 'juana'])
    expect((await search('@ANA_G'))[0]).toMatchObject({ username: 'ana_g', displayName: 'ana_g', petsCount: 0 })
    expect(await search('martín')).toEqual([expect.objectContaining({ username: 'duena_de_luna' })])
  })

  it('los comodines de SQL se buscan como texto y hacen falta 2 letras', async () => {
    await createUser('ana_g')
    await createUser('anabel')
    expect((await search('a_')).map((u: { username: string }) => u.username)).toEqual(['ana_g'])
    expect(await search('%%')).toEqual([])
    expect((await request.get('/users').query({ q: 'a' })).status).toBe(400)
  })
})

describe('guía de primeros pasos', () => {
  it('una cuenta nueva la tiene pendiente hasta que la termina, y no se puede volver atrás', async () => {
    const user = await createUser('nueva')
    expect((await request.get('/me').set(user.auth)).body.onboardingDone).toBe(false)

    const done = await request.put('/me/onboarding').set(user.auth)
    expect(done.body.onboardingDone).toBe(true)
    expect((await request.put('/me/onboarding').set(user.auth)).body.onboardingDone).toBe(true)
    expect((await request.get('/me').set(user.auth)).body).not.toHaveProperty('onboardedAt')
  })
})
