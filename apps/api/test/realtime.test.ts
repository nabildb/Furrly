import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPet, createUser, mediaUrl, request } from './helpers.js'

/** Lo que la API manda a Supabase Realtime (el "timbre"). */
function mockRealtime() {
  const rings: { topic: string; event: string; payload: Record<string, string>; private: boolean }[] = []
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    if (String(input) === 'http://supabase.test/realtime/v1/api/broadcast') {
      rings.push(...JSON.parse(String(init?.body)).messages)
    }
    return new Response(null, { status: 202 })
  })
  return rings
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('timbre en tiempo real', () => {
  it('al enviar un mensaje suena en el canal privado del destinatario, sin el contenido', async () => {
    const recipient = await createUser('nabil')
    const sender = await createUser('vecina')
    const rings = mockRealtime()

    const res = await request.post('/conversations').set(sender.auth).send({ username: 'nabil', body: 'Mi teléfono es el 600 123 456' })

    expect(rings).toEqual([
      { topic: `user:${recipient.id}`, event: 'message', payload: { conversationId: res.body.conversationId }, private: true },
    ])
    expect(JSON.stringify(rings)).not.toContain('600 123 456')
  })

  it('las notificaciones también suenan, para que los globos se actualicen al momento', async () => {
    const owner = await createUser('nabil')
    const fan = await createUser('vecina')
    const pet = await createPet(owner)
    const post = await request.post('/posts').set(owner.auth).send({ petId: pet.id, imageUrl: mediaUrl(owner.id) })
    const rings = mockRealtime()

    await request.post(`/posts/${post.body.id}/comments`).set(fan.auth).send({ body: '¡Qué bonita!' })
    expect(rings).toEqual([{ topic: `user:${owner.id}`, event: 'notification', payload: {}, private: true }])
  })
})
