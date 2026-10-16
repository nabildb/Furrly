import { describe, expect, it } from 'vitest'
import { createLostReport, createPet, createUser, minutesAgo, request, RETIRO, SOL, type TestUser } from './helpers.js'

async function setup() {
  const owner = await createUser('nabil')
  const neighbour = await createUser('vecina')
  const pet = await createPet(owner)
  const report = await createLostReport(owner, pet.id, { happenedAt: minutesAgo(180) })
  return { owner, neighbour, report }
}

const sighting = (minutes: number, extra: Record<string, unknown> = {}) => ({
  ...RETIRO,
  seenAt: minutesAgo(minutes),
  note: 'Cerca del estanque',
  ...extra,
})

const addSighting = (user: TestUser, reportId: string, body: Record<string, unknown>) =>
  request.post(`/reports/${reportId}/sightings`).set(user.auth).send(body)

describe('avistamientos', () => {
  it('se listan en orden cronológico con su ubicación y autor', async () => {
    const { neighbour, report } = await setup()
    await addSighting(neighbour, report.id, sighting(30, { note: 'segundo' }))
    await addSighting(neighbour, report.id, sighting(90, { note: 'primero' }))

    const res = await request.get(`/reports/${report.id}/sightings`)
    expect(res.body.map((s: { note: string }) => s.note)).toEqual(['primero', 'segundo'])
    expect(res.body[0].user.username).toBe('vecina')
    expect(res.body[0].location.lat).toBeCloseTo(RETIRO.lat, 6)
  })

  it('solo se admiten en avisos de pérdida activos y posteriores a la pérdida', async () => {
    const { owner, neighbour, report } = await setup()

    const found = await request
      .post('/reports')
      .set(owner.auth)
      .send({ type: 'found', species: 'cat', title: 'Gato', description: 'Gato encontrado', ...SOL, happenedAt: minutesAgo(10) })
    expect((await addSighting(neighbour, found.body.id, sighting(5))).status).toBe(400)

    expect((await addSighting(neighbour, report.id, sighting(300))).status).toBe(400)

    await request.patch(`/reports/${report.id}/status`).set(owner.auth).send({ status: 'resolved' })
    expect((await addSighting(neighbour, report.id, sighting(5))).status).toBe(409)
  })

  it('requiere sesión', async () => {
    const { report } = await setup()
    expect((await request.post(`/reports/${report.id}/sightings`).send(sighting(5))).status).toBe(401)
  })

  it('lo puede borrar su autor o el autor del aviso, pero nadie más', async () => {
    const { owner, neighbour, report } = await setup()
    const stranger = await createUser('extrana')
    const first = await addSighting(neighbour, report.id, sighting(60))
    const second = await addSighting(neighbour, report.id, sighting(30))

    const url = (id: string) => `/reports/${report.id}/sightings/${id}`
    expect((await request.delete(url(first.body.id)).set(stranger.auth)).status).toBe(404)
    expect((await request.delete(url(first.body.id)).set(neighbour.auth)).status).toBe(204)
    expect((await request.delete(url(second.body.id)).set(owner.auth)).status).toBe(204)
    expect((await request.get(`/reports/${report.id}/sightings`)).body).toHaveLength(0)
  })
})
