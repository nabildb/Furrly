import { describe, expect, it } from 'vitest'
import { MESSAGES_PER_HOUR, NEW_CONVERSATIONS_PER_DAY } from '../src/routes/conversations.js'
import { createLostReport, createPet, createUser, mediaUrl, request, RETIRO, SOL, type TestUser } from './helpers.js'

const write = (from: TestUser, username: string, body = 'Hola') =>
  request.post('/conversations').set(from.auth).send({ username, body })

describe('bloquear usuarios', () => {
  it('se bloquea y desbloquea; el perfil dice si lo has bloqueado tú (y solo tú)', async () => {
    const me = await createUser('nabil')
    const other = await createUser('pesado')

    expect((await request.put('/users/pesado/block').set(me.auth)).body).toEqual({ blockedByMe: true })
    expect((await request.put('/users/pesado/block').set(me.auth)).status).toBe(200)
    expect((await request.get('/users/pesado').set(me.auth)).body.blockedByMe).toBe(true)
    // El bloqueado no sabe que lo han bloqueado.
    expect((await request.get('/users/nabil').set(other.auth)).body.blockedByMe).toBe(false)
    expect((await request.get('/me/blocks').set(me.auth)).body).toEqual([
      expect.objectContaining({ username: 'pesado' }),
    ])

    expect((await request.delete('/users/pesado/block').set(me.auth)).body).toEqual({ blockedByMe: false })
    expect((await request.get('/me/blocks').set(me.auth)).body).toEqual([])
    expect((await request.put('/users/nabil/block').set(me.auth)).status).toBe(400)
  })

  it('con un bloqueo nadie puede escribir al otro, en ningún sentido, hasta desbloquear', async () => {
    const me = await createUser('nabil')
    const other = await createUser('pesado')
    const { body } = await write(other, 'nabil', 'Hola de nuevo')
    await request.put('/users/pesado/block').set(me.auth)

    expect((await write(other, 'nabil')).status).toBe(403)
    expect((await write(me, 'pesado')).status).toBe(403)
    const reply = await request.post(`/conversations/${body.conversationId}/messages`).set(other.auth).send({ body: '¿Hola?' })
    expect(reply.status).toBe(403)

    const mine = await request.get(`/conversations/${body.conversationId}`).set(me.auth)
    expect(mine.body).toMatchObject({ canReply: false, blockedByMe: true })
    const theirs = await request.get(`/conversations/${body.conversationId}`).set(other.auth)
    expect(theirs.body).toMatchObject({ canReply: false, blockedByMe: false })

    await request.delete('/users/pesado/block').set(me.auth)
    expect((await write(other, 'nabil')).status).toBe(201)
  })

  it('el bloqueado no puede comentar, dar like ni seguir a tus mascotas, ni te llegan sus avisos', async () => {
    const me = await createUser('nabil')
    const other = await createUser('pesado')
    const pet = await createPet(me)
    const post = await request.post('/posts').set(me.auth).send({ petId: pet.id, imageUrl: mediaUrl(me.id) })
    await request.patch('/me').set(me.auth).send({ alertLocation: RETIRO, alertRadiusKm: 5 })
    await request.put('/users/pesado/block').set(me.auth)

    expect((await request.post(`/posts/${post.body.id}/comments`).set(other.auth).send({ body: 'Hola' })).status).toBe(403)
    expect((await request.put(`/posts/${post.body.id}/like`).set(other.auth)).status).toBe(403)
    expect((await request.put(`/pets/${pet.id}/follow`).set(other.auth)).status).toBe(403)

    // Un aviso suyo en mi zona no me genera notificación.
    await createLostReport(other, (await createPet(other)).id, SOL)
    expect((await request.get('/notifications').set(me.auth)).body.notifications).toEqual([])
  })
})

describe('límites contra el spam', () => {
  it(`no deja enviar más de ${MESSAGES_PER_HOUR} mensajes en una hora`, async () => {
    const me = await createUser('nabil')
    await createUser('vecina')
    const { body } = await write(me, 'vecina', 'Mensaje 1')
    for (let i = 2; i <= MESSAGES_PER_HOUR; i++) {
      const res = await request.post(`/conversations/${body.conversationId}/messages`).set(me.auth).send({ body: `Mensaje ${i}` })
      expect(res.status).toBe(201)
    }
    const over = await request.post(`/conversations/${body.conversationId}/messages`).set(me.auth).send({ body: 'Uno más' })
    expect(over.status).toBe(429)
  })

  it(`no deja empezar más de ${NEW_CONVERSATIONS_PER_DAY} conversaciones al día, pero sí seguir las que ya hay`, async () => {
    const me = await createUser('nabil')
    for (let i = 0; i < NEW_CONVERSATIONS_PER_DAY; i++) {
      await createUser(`vecino${i}`)
      expect((await write(me, `vecino${i}`)).status).toBe(201)
    }
    await createUser('uno_mas')
    expect((await write(me, 'uno_mas')).status).toBe(429)
    // Escribir en una conversación que ya existe sí se puede.
    expect((await write(me, 'vecino0', 'Sigo por aquí')).status).toBe(201)
    // Y que otros te escriban a ti no cuenta como empezarlas tú.
    const other = await createUser('vecina_nueva')
    expect((await write(other, 'nabil')).status).toBe(201)
  })
})

describe('denunciar conversaciones', () => {
  it('solo puede denunciarla quien participa en ella', async () => {
    const me = await createUser('nabil')
    const other = await createUser('pesado')
    const outsider = await createUser('curioso')
    const { body } = await write(other, 'nabil')
    const flag = { targetType: 'conversation', targetId: body.conversationId, reason: 'spam' }

    expect((await request.post('/flags').set(me.auth).send(flag)).status).toBe(201)
    expect((await request.post('/flags').set(outsider.auth).send(flag)).status).toBe(404)
  })
})
