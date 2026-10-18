import { describe, expect, it } from 'vitest'
import { ALCALA, createLostReport, createPet, createUser, minutesAgo, request, RETIRO, SOL, type TestUser } from './helpers.js'

const found = async (user: TestUser, body: Record<string, unknown> = {}) => {
  const res = await request
    .post('/reports')
    .set(user.auth)
    .send({ type: 'found', species: 'dog', title: 'Perro encontrado', description: 'Con collar azul', ...RETIRO, happenedAt: minutesAgo(30), ...body })
  if (res.status !== 201) throw new Error(`found: ${res.status} ${JSON.stringify(res.body)}`)
  return res.body as { id: string }
}

const matchIds = async (reportId: string) =>
  (await request.get(`/reports/${reportId}/matches`)).body.map((m: { id: string }) => m.id)

const matchNotifications = async (user: TestUser) =>
  (await request.get('/notifications').set(user.auth)).body.notifications
    .filter((n: { type: string }) => n.type === 'possible_match')
    .map((n: { report: { id: string } }) => n.report.id)

describe('coincidencias entre perdidos y encontrados', () => {
  it('un perro encontrado cerca y después de la pérdida coincide, y se avisa a los dos', async () => {
    const owner = await createUser('nabil')
    const finder = await createUser('vecina')
    const lost = await createLostReport(owner, (await createPet(owner)).id, { ...SOL, happenedAt: minutesAgo(180) })
    const report = await found(finder)

    expect(await matchIds(lost.id)).toEqual([report.id])
    const [match] = (await request.get(`/reports/${report.id}/matches`)).body
    expect(match).toMatchObject({ id: lost.id, type: 'lost', petName: 'Luna' })
    expect(match.distanceM).toBeGreaterThan(1000)
    expect(match.distanceM).toBeLessThan(2500)
    expect(match).not.toHaveProperty('reporterId')

    expect(await matchNotifications(owner)).toEqual([report.id])
    expect(await matchNotifications(finder)).toEqual([lost.id])
  })

  it('no coinciden si cambia la especie, están lejos, las fechas no encajan o el aviso está resuelto', async () => {
    const owner = await createUser('nabil')
    const finder = await createUser('vecina')
    const lost = await createLostReport(owner, (await createPet(owner)).id, { ...SOL, happenedAt: minutesAgo(180) })

    await found(finder, { species: 'cat' })
    await found(finder, { ...ALCALA })
    await found(finder, { happenedAt: minutesAgo(3 * 24 * 60) }) // encontrado 3 días ANTES de perderse
    expect(await matchIds(lost.id)).toEqual([])

    const later = await found(finder)
    expect(await matchIds(lost.id)).toEqual([later.id])
    await request.patch(`/reports/${lost.id}/status`).set(owner.auth).send({ status: 'resolved' })
    expect(await matchIds(later.id)).toEqual([])
  })

  it('nunca entre avisos de la misma persona ni con un bloqueo de por medio', async () => {
    const owner = await createUser('nabil')
    const other = await createUser('pesado')
    const lost = await createLostReport(owner, (await createPet(owner)).id, { ...SOL, happenedAt: minutesAgo(180) })
    await found(owner)
    await request.put('/users/pesado/block').set(owner.auth)
    await found(other)

    expect(await matchIds(lost.id)).toEqual([])
    expect(await matchNotifications(owner)).toEqual([])
  })
})
