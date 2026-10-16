import { describe, expect, it } from 'vitest'
import { ALCALA, createLostReport, createPet, createUser, minutesAgo, RETIRO, request, SOL } from './helpers.js'

const foundReport = (body: Record<string, unknown> = {}) => ({
  type: 'found',
  species: 'cat',
  title: 'Gato encontrado',
  description: 'Gato atigrado muy sociable',
  ...SOL,
  happenedAt: minutesAgo(30),
  ...body,
})

describe('crear avisos', () => {
  it('un aviso de pérdida toma la especie de la mascota y guarda la ubicación', async () => {
    const owner = await createUser('nabil')
    const pet = await createPet(owner, { species: 'rabbit' })
    const report = await createLostReport(owner, pet.id, RETIRO)

    const res = await request.get(`/reports/${report.id}`)
    expect(res.body).toMatchObject({ type: 'lost', status: 'active', species: 'rabbit', pet: { id: pet.id } })
    expect(res.body.location.lat).toBeCloseTo(RETIRO.lat, 6)
    expect(res.body.location.lng).toBeCloseTo(RETIRO.lng, 6)
  })

  it('exige una mascota propia para avisar de una pérdida', async () => {
    const owner = await createUser('nabil')
    const other = await createUser('otra')
    const othersPet = await createPet(other)

    const withoutPet = await request.post('/reports').set(owner.auth).send({ ...foundReport(), type: 'lost' })
    expect(withoutPet.status).toBe(400)

    const res = await request
      .post('/reports')
      .set(owner.auth)
      .send({ ...foundReport(), type: 'lost', petId: othersPet.id })
    expect(res.status).toBe(404)
  })

  it('no permite dos avisos de pérdida activos para la misma mascota', async () => {
    const owner = await createUser('nabil')
    const pet = await createPet(owner)
    await createLostReport(owner, pet.id)
    await expect(createLostReport(owner, pet.id)).rejects.toThrow(/409/)
  })

  it('un aviso de encontrada exige especie y no admite fechas futuras', async () => {
    const user = await createUser('nabil')
    expect((await request.post('/reports').set(user.auth).send(foundReport({ species: undefined }))).status).toBe(400)
    expect(
      (await request.post('/reports').set(user.auth).send(foundReport({ happenedAt: '2099-01-01T00:00:00Z' }))).status,
    ).toBe(400)
    expect((await request.post('/reports').set(user.auth).send(foundReport())).status).toBe(201)
  })
})

describe('GET /reports (avisos cercanos)', () => {
  it('devuelve los avisos activos dentro del radio, del más cercano al más lejano', async () => {
    const user = await createUser('nabil')
    const near = await request.post('/reports').set(user.auth).send(foundReport({ title: 'En Sol', ...SOL }))
    const mid = await request.post('/reports').set(user.auth).send(foundReport({ title: 'En el Retiro', ...RETIRO }))
    await request.post('/reports').set(user.auth).send(foundReport({ title: 'En Alcalá', ...ALCALA }))

    const res = await request.get('/reports').query({ ...SOL, radiusKm: 5 })
    expect(res.status).toBe(200)
    expect(res.body.map((r: { id: string }) => r.id)).toEqual([near.body.id, mid.body.id])
    expect(res.body[0].distanceM).toBe(0)
    expect(res.body[1].distanceM).toBeGreaterThan(1500)
    expect(res.body[1].distanceM).toBeLessThan(1800)

    const wide = await request.get('/reports').query({ ...SOL, radiusKm: 50 })
    expect(wide.body).toHaveLength(3)
  })

  it('filtra por tipo y especie y no muestra avisos cerrados', async () => {
    const owner = await createUser('nabil')
    const pet = await createPet(owner, { species: 'dog' })
    const lost = await createLostReport(owner, pet.id)
    const cat = await request.post('/reports').set(owner.auth).send(foundReport())

    const lostOnly = await request.get('/reports').query({ ...SOL, type: 'lost' })
    expect(lostOnly.body.map((r: { id: string }) => r.id)).toEqual([lost.id])

    const cats = await request.get('/reports').query({ ...SOL, species: 'cat' })
    expect(cats.body.map((r: { id: string }) => r.id)).toEqual([cat.body.id])

    await request.patch(`/reports/${lost.id}/status`).set(owner.auth).send({ status: 'resolved' })
    const afterResolve = await request.get('/reports').query(SOL)
    expect(afterResolve.body.map((r: { id: string }) => r.id)).toEqual([cat.body.id])
  })

  it('valida los parámetros', async () => {
    expect((await request.get('/reports').query({ lat: 'abc', lng: 1 })).status).toBe(400)
    expect((await request.get('/reports').query({ ...SOL, radiusKm: 500 })).status).toBe(400)
  })
})

describe('PATCH /reports/:id/status', () => {
  it('solo el autor puede cerrar el aviso, y solo una vez', async () => {
    const owner = await createUser('nabil')
    const intruder = await createUser('intruso')
    const pet = await createPet(owner)
    const report = await createLostReport(owner, pet.id)

    const byIntruder = await request.patch(`/reports/${report.id}/status`).set(intruder.auth).send({ status: 'resolved' })
    expect(byIntruder.status).toBe(404)

    const resolved = await request.patch(`/reports/${report.id}/status`).set(owner.auth).send({ status: 'resolved' })
    expect(resolved.status).toBe(200)
    expect(resolved.body.status).toBe('resolved')
    expect(resolved.body.resolvedAt).not.toBeNull()

    const again = await request.patch(`/reports/${report.id}/status`).set(owner.auth).send({ status: 'cancelled' })
    expect(again.status).toBe(404)
  })

  it('al cancelar no se rellena resolvedAt (CHECK de la BD)', async () => {
    const owner = await createUser('nabil')
    const pet = await createPet(owner)
    const report = await createLostReport(owner, pet.id)
    const res = await request.patch(`/reports/${report.id}/status`).set(owner.auth).send({ status: 'cancelled' })
    expect(res.body).toMatchObject({ status: 'cancelled', resolvedAt: null })
  })
})
