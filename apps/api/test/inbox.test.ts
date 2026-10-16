import { describe, expect, it } from 'vitest'
import { prisma } from '../src/lib/prisma.js'
import { ALCALA, createLostReport, createPet, createUser, mediaUrl, minutesAgo, request, RETIRO, SOL, type TestUser } from './helpers.js'

const notificationTypes = async (user: TestUser) =>
  (await request.get('/notifications').set(user.auth)).body.notifications.map((n: { type: string }) => n.type)

const inbox = async (user: TestUser) => (await request.get('/me/inbox').set(user.auth)).body

describe('contacto en los avisos', () => {
  it('solo se enseña a usuarios con sesión', async () => {
    const owner = await createUser('nabil')
    const viewer = await createUser('vecina')
    const pet = await createPet(owner)
    const report = await createLostReport(owner, pet.id, { contactPhone: '+34 600 123 456', contactEmail: 'nabil@example.com' })

    const anonymous = await request.get(`/reports/${report.id}`)
    expect(anonymous.body).toMatchObject({ hasContact: true, contact: null })

    const loggedIn = await request.get(`/reports/${report.id}`).set(viewer.auth)
    expect(loggedIn.body.contact).toEqual({ phone: '+34 600 123 456', email: 'nabil@example.com' })

    const cleared = await request.patch(`/reports/${report.id}`).set(owner.auth).send({ contactPhone: '', contactEmail: '' })
    expect(cleared.body).toMatchObject({ hasContact: false, contact: null })
  })

  it('valida teléfono y email', async () => {
    const owner = await createUser('nabil')
    const pet = await createPet(owner)
    await expect(createLostReport(owner, pet.id, { contactPhone: 'llámame' })).rejects.toThrow(/400/)
    await expect(createLostReport(owner, pet.id, { contactEmail: 'no-es-un-email' })).rejects.toThrow(/400/)
  })
})

describe('alertas y notificaciones', () => {
  it('un aviso nuevo avisa solo a los vecinos cuya zona lo cubre', async () => {
    const reporter = await createUser('nabil')
    const near = await createUser('cerca')
    const far = await createUser('lejos')
    const noZone = await createUser('sinzona')
    await request.patch('/me').set(near.auth).send({ alertLocation: RETIRO, alertRadiusKm: 2 }) // ~1,6 km de Sol
    await request.patch('/me').set(far.auth).send({ alertLocation: ALCALA, alertRadiusKm: 5 }) // ~30 km
    await request.patch('/me').set(reporter.auth).send({ alertLocation: SOL, alertRadiusKm: 5 })

    const report = await createLostReport(reporter, (await createPet(reporter)).id, SOL)

    const res = await request.get('/notifications').set(near.auth)
    expect(res.body.notifications).toHaveLength(1)
    expect(res.body.notifications[0]).toMatchObject({
      type: 'new_report_nearby',
      readAt: null,
      actor: { username: 'nabil' },
      report: { id: report.id, type: 'lost' },
    })
    expect(await notificationTypes(far)).toEqual([])
    expect(await notificationTypes(noZone)).toEqual([])
    // A uno mismo no se le notifica su propio aviso.
    expect(await notificationTypes(reporter)).toEqual([])
  })

  it('avistamientos y avisos resueltos avisan a quien corresponde', async () => {
    const owner = await createUser('nabil')
    const helper = await createUser('vecina')
    const report = await createLostReport(owner, (await createPet(owner)).id)

    await request.post(`/reports/${report.id}/sightings`).set(helper.auth).send({ ...RETIRO, seenAt: minutesAgo(5) })
    expect(await notificationTypes(owner)).toEqual(['new_sighting'])

    await request.patch(`/reports/${report.id}/status`).set(owner.auth).send({ status: 'resolved' })
    expect(await notificationTypes(helper)).toEqual(['report_resolved'])
  })

  it('likes, comentarios y seguidores avisan al dueño una sola vez, y se marcan como leídas', async () => {
    const owner = await createUser('nabil')
    const fan = await createUser('fan')
    const pet = await createPet(owner)
    const post = await request.post('/posts').set(owner.auth).send({ petId: pet.id, imageUrl: mediaUrl(owner.id) })

    await request.put(`/posts/${post.body.id}/like`).set(fan.auth)
    await request.put(`/posts/${post.body.id}/like`).set(fan.auth)
    await request.post(`/posts/${post.body.id}/comments`).set(fan.auth).send({ body: '¡Qué bonita!' })
    await request.put(`/pets/${pet.id}/follow`).set(fan.auth)
    await request.put(`/pets/${pet.id}/follow`).set(fan.auth)
    // Lo propio no notifica.
    await request.post(`/posts/${post.body.id}/comments`).set(owner.auth).send({ body: 'Gracias' })

    expect(await notificationTypes(owner)).toEqual(['new_follower', 'new_comment', 'new_like'])
    expect((await inbox(owner)).notifications).toBe(3)

    expect((await request.post('/notifications/read').set(owner.auth)).status).toBe(204)
    expect((await inbox(owner)).notifications).toBe(0)
  })
})

describe('mensajes', () => {
  it('una sola conversación por pareja, con no leídos para quien recibe', async () => {
    const owner = await createUser('nabil')
    const finder = await createUser('vecina')
    const report = await createLostReport(owner, (await createPet(owner)).id)

    const first = await request
      .post('/conversations')
      .set(finder.auth)
      .send({ username: 'nabil', body: 'Creo que he visto a Luna', reportId: report.id })
    expect(first.status).toBe(201)
    const second = await request.post('/conversations').set(finder.auth).send({ username: 'NABIL', body: '¿Me llamas?' })
    expect(second.body.conversationId).toBe(first.body.conversationId)

    expect((await inbox(owner)).messages).toBe(2)
    expect((await inbox(finder)).messages).toBe(0)

    const list = await request.get('/conversations').set(owner.auth)
    expect(list.body).toEqual([
      expect.objectContaining({
        id: first.body.conversationId,
        other: expect.objectContaining({ username: 'vecina' }),
        lastMessage: expect.objectContaining({ body: '¿Me llamas?', fromMe: false }),
        unread: 2,
      }),
    ])

    const opened = await request.get(`/conversations/${first.body.conversationId}`).set(owner.auth)
    expect(opened.body.messages.map((m: { body: string }) => m.body)).toEqual(['Creo que he visto a Luna', '¿Me llamas?'])
    expect(opened.body.messages[0].report).toMatchObject({ id: report.id })
    expect((await inbox(owner)).messages).toBe(0)

    const reply = await request.post(`/conversations/${first.body.conversationId}/messages`).set(owner.auth).send({ body: 'Sí, ¡gracias!' })
    expect(reply.body).toMatchObject({ body: 'Sí, ¡gracias!', fromMe: true })
    expect((await inbox(finder)).messages).toBe(1)
  })

  it('nadie más puede leer ni escribir en la conversación', async () => {
    const a = await createUser('nabil')
    await createUser('vecina')
    const intruder = await createUser('intruso')
    const { body } = await request.post('/conversations').set(a.auth).send({ username: 'vecina', body: 'Hola' })

    expect((await request.get(`/conversations/${body.conversationId}`).set(intruder.auth)).status).toBe(404)
    const write = await request.post(`/conversations/${body.conversationId}/messages`).set(intruder.auth).send({ body: 'Hola' })
    expect(write.status).toBe(404)
    expect((await request.post('/conversations').set(a.auth).send({ username: 'nabil', body: 'Yo' })).status).toBe(400)
    expect((await request.post('/conversations').set(a.auth).send({ username: 'nadie', body: 'Hola' })).status).toBe(404)
    expect((await request.post('/conversations').set(a.auth).send({ username: 'vecina', body: '   ' })).status).toBe(400)
  })
})

describe('denuncias', () => {
  it('se registran una vez por persona y contenido', async () => {
    const owner = await createUser('nabil')
    const reporter = await createUser('vecina')
    const pet = await createPet(owner)
    const post = await request.post('/posts').set(owner.auth).send({ petId: pet.id, imageUrl: mediaUrl(owner.id) })

    const flag = { targetType: 'post', targetId: post.body.id, reason: 'inappropriate' }
    expect((await request.post('/flags').set(reporter.auth).send(flag)).status).toBe(201)
    expect((await request.post('/flags').set(reporter.auth).send(flag)).status).toBe(201)
    expect(await prisma.contentFlag.count()).toBe(1)

    const user = await request.post('/flags').set(reporter.auth).send({ targetType: 'user', username: 'nabil', reason: 'spam' })
    expect(user.status).toBe(201)
    const self = await request.post('/flags').set(owner.auth).send({ targetType: 'user', username: 'nabil', reason: 'spam' })
    expect(self.status).toBe(400)
    const missing = { targetType: 'report', targetId: '00000000-0000-4000-8000-000000000000', reason: 'fake' }
    expect((await request.post('/flags').set(reporter.auth).send(missing)).status).toBe(404)
    expect((await request.post('/flags').send(flag)).status).toBe(401)
  })
})

describe('borrar la cuenta', () => {
  it('borra el perfil y todo lo suyo', async () => {
    const user = await createUser('nabil')
    const other = await createUser('vecina')
    const pet = await createPet(user)
    const report = await createLostReport(user, pet.id)
    await request.post('/conversations').set(user.auth).send({ username: 'vecina', body: 'Hola' })

    expect((await request.delete('/me').set(user.auth)).status).toBe(204)
    expect((await request.get('/users/nabil')).status).toBe(404)
    expect((await request.get(`/pets/${pet.id}`)).status).toBe(404)
    expect((await request.get(`/reports/${report.id}`)).status).toBe(404)
    expect((await request.get('/conversations').set(other.auth)).body).toEqual([])
  })
})
