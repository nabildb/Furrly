import { describe, expect, it } from 'vitest'
import { prisma } from '../src/lib/prisma.js'
import { createPet, createUser, mediaUrl, request, type TestUser } from './helpers.js'

async function createAdmin(username = 'nabil') {
  const admin = await createUser(username)
  await prisma.user.update({ where: { id: admin.id }, data: { isAdmin: true } })
  return admin
}

async function createPost(user: TestUser) {
  const pet = await createPet(user)
  return (await request.post('/posts').set(user.auth).send({ petId: pet.id, imageUrl: mediaUrl(user.id), caption: 'Spam spam' })).body as { id: string }
}

const flag = (user: TestUser, body: object) => request.post('/flags').set(user.auth).send({ reason: 'spam', ...body })
const pending = async (admin: TestUser) => (await request.get('/admin/flags').set(admin.auth)).body

describe('panel de moderación', () => {
  it('solo pueden entrar los moderadores, y nadie puede hacerse moderador desde la API', async () => {
    const user = await createUser('vecina')
    expect((await request.get('/admin/flags')).status).toBe(401)
    expect((await request.get('/admin/flags').set(user.auth)).status).toBe(403)

    await request.patch('/me').set(user.auth).send({ isAdmin: true })
    const me = await request.get('/me').set(user.auth)
    expect(me.body.isAdmin).toBe(false)
    expect((await request.get('/admin/flags').set(user.auth)).status).toBe(403)
  })

  it('agrupa las denuncias por contenido y enseña qué es y de quién', async () => {
    const admin = await createAdmin()
    const spammer = await createUser('spammer')
    const a = await createUser('vecina')
    const b = await createUser('vecino')
    const post = await createPost(spammer)
    await flag(a, { targetType: 'post', targetId: post.id })
    await flag(b, { targetType: 'post', targetId: post.id, reason: 'inappropriate', details: 'Anuncios' })
    await flag(a, { targetType: 'user', username: 'spammer' })

    const items = await pending(admin)
    expect(items).toHaveLength(2)
    const postItem = items.find((i: { targetType: string }) => i.targetType === 'post')
    expect(postItem).toMatchObject({
      count: 2,
      target: { text: 'Spam spam', url: `/publicaciones/${post.id}`, author: { username: 'spammer', suspendedAt: null } },
    })
    expect(postItem.flags.map((f: { by: string }) => f.by).sort()).toEqual(['vecina', 'vecino'])
    expect((await request.get('/admin/flags/count').set(admin.auth)).body).toEqual({ pending: 2 })
  })

  it('borrar el contenido lo elimina y pasa las denuncias a resueltas; descartar lo deja', async () => {
    const admin = await createAdmin()
    const author = await createUser('autora')
    const reporter = await createUser('vecina')
    const removed = await createPost(author)
    const kept = await createPost(author)
    await flag(reporter, { targetType: 'post', targetId: removed.id })
    await flag(reporter, { targetType: 'post', targetId: kept.id })

    const resolve = (targetId: string, action: string) =>
      request.post('/admin/flags/resolve').set(admin.auth).send({ targetType: 'post', targetId, action })
    expect((await resolve(removed.id, 'remove')).status).toBe(200)
    expect((await resolve(kept.id, 'dismiss')).status).toBe(200)
    expect((await resolve(kept.id, 'dismiss')).status).toBe(404)

    expect((await request.get(`/posts/${removed.id}`)).status).toBe(404)
    expect((await request.get(`/posts/${kept.id}`)).status).toBe(200)
    expect(await pending(admin)).toEqual([])
    const resolved = (await request.get('/admin/flags?estado=resueltas').set(admin.auth)).body
    expect(resolved).toHaveLength(2)
    expect(resolved.find((i: { targetId: string }) => i.targetId === removed.id).target).toBeNull()
  })

  it('suspender al autor le corta el acceso hasta que se levanta la suspensión', async () => {
    const admin = await createAdmin()
    const troll = await createUser('troll')
    const reporter = await createUser('vecina')
    const post = await createPost(reporter)
    const comment = await request.post(`/posts/${post.id}/comments`).set(troll.auth).send({ body: 'Insulto' })
    await flag(reporter, { targetType: 'comment', targetId: comment.body.id })

    await request.post('/admin/flags/resolve').set(admin.auth).send({ targetType: 'comment', targetId: comment.body.id, action: 'suspend' })
    const blocked = await request.get('/me').set(troll.auth)
    expect(blocked.status).toBe(403)
    expect(blocked.body.error).toMatch(/suspendida/)
    expect((await request.get('/admin/suspended').set(admin.auth)).body).toEqual([expect.objectContaining({ username: 'troll' })])

    expect((await request.delete('/admin/suspended/troll').set(admin.auth)).status).toBe(204)
    expect((await request.get('/me').set(troll.auth)).status).toBe(200)
  })

  it('en una conversación denunciada se ven los mensajes y se suspende al otro participante', async () => {
    const admin = await createAdmin()
    const pesado = await createUser('pesado')
    const vecina = await createUser('vecina')
    const { body } = await request.post('/conversations').set(pesado.auth).send({ username: 'vecina', body: 'Dame tu número' })
    await flag(vecina, { targetType: 'conversation', targetId: body.conversationId })

    const [item] = await pending(admin)
    expect(item.target).toMatchObject({
      author: { username: 'pesado' },
      messages: [expect.objectContaining({ from: 'pesado', body: 'Dame tu número' })],
    })
    await request.post('/admin/flags/resolve').set(admin.auth).send({ targetType: 'conversation', targetId: body.conversationId, action: 'suspend' })
    expect((await request.get('/me').set(pesado.auth)).status).toBe(403)
    expect((await request.get('/me').set(vecina.auth)).status).toBe(200)
  })

  it('el error de prueba de Sentry es un 500 y solo lo pueden lanzar los moderadores', async () => {
    const admin = await createAdmin()
    const user = await createUser('vecina')
    expect((await request.post('/admin/sentry-test').set(user.auth)).status).toBe(403)
    const res = await request.post('/admin/sentry-test').set(admin.auth)
    expect(res.status).toBe(500)
    expect(res.body).toEqual({ error: 'Error interno del servidor' })
  })

  it('no se puede suspender a un moderador ni borrar usuarios o conversaciones', async () => {
    const admin = await createAdmin()
    const otherAdmin = await createAdmin('moderadora')
    const user = await createUser('vecina')
    await flag(user, { targetType: 'user', username: 'moderadora' })

    const res = (action: string) =>
      request.post('/admin/flags/resolve').set(admin.auth).send({ targetType: 'user', targetId: otherAdmin.id, action })
    expect((await res('suspend')).status).toBe(400)
    expect((await res('remove')).status).toBe(400)
  })
})
