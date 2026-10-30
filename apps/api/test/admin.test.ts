import { describe, expect, it } from 'vitest'
import { prisma } from '../src/lib/prisma.js'
import { createLostReport, createPet, createUser, mediaUrl, minutesAgo, request, RETIRO, type TestUser } from './helpers.js'

async function createAdmin(username = 'nabil') {
  const admin = await createUser(username)
  await prisma.user.update({ where: { id: admin.id }, data: { isAdmin: true } })
  return admin
}

async function createPost(user: TestUser) {
  const pet = await createPet(user)
  return (await request.post('/posts').set(user.auth).send({ petId: pet.id, imageUrl: mediaUrl(user.id), caption: 'Spam spam' })).body as { id: string }
}

const decision = { reason: 'spam' }
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

describe('moderación directa, sin denuncia', () => {
  const remove = (user: TestUser, type: string, id: string) => request.delete(`/admin/content/${type}/${id}`).set(user.auth).send(decision)

  it('un moderador borra publicaciones, comentarios, avisos y avistamientos de cualquiera', async () => {
    const admin = await createAdmin()
    const author = await createUser('autora')
    const neighbour = await createUser('vecina')
    const post = await createPost(author)
    const comment = await request.post(`/posts/${post.id}/comments`).set(neighbour.auth).send({ body: 'Insulto' })
    const pet = await createPet(author, { name: 'Toby' })
    const report = await createLostReport(author, pet.id)
    const sighting = await request.post(`/reports/${report.id}/sightings`).set(neighbour.auth).send({ ...RETIRO, seenAt: minutesAgo(30) })

    expect((await remove(admin, 'comment', comment.body.id)).status).toBe(204)
    expect((await request.get(`/posts/${post.id}/comments`)).body).toEqual([])
    expect((await remove(admin, 'post', post.id)).status).toBe(204)
    expect((await request.get(`/posts/${post.id}`)).status).toBe(404)
    expect((await remove(admin, 'sighting', sighting.body.id)).status).toBe(204)
    expect((await request.get(`/reports/${report.id}/sightings`)).body).toEqual([])
    expect((await remove(admin, 'report', report.id)).status).toBe(204)
    expect((await request.get(`/reports/${report.id}`)).status).toBe(404)
  })

  it('borrar una mascota se lleva sus publicaciones y sus avisos', async () => {
    const admin = await createAdmin()
    const owner = await createUser('autora')
    const pet = await createPet(owner)
    const post = await request.post('/posts').set(owner.auth).send({ petId: pet.id, imageUrl: mediaUrl(owner.id) })
    const report = await createLostReport(owner, pet.id)

    expect((await remove(admin, 'pet', pet.id)).status).toBe(204)
    expect((await request.get(`/pets/${pet.id}`)).status).toBe(404)
    expect((await request.get(`/posts/${post.body.id}`)).status).toBe(404)
    expect((await request.get(`/reports/${report.id}`)).status).toBe(404)
  })

  it('las denuncias de lo que cae con lo borrado también quedan resueltas', async () => {
    const admin = await createAdmin()
    const author = await createUser('autora')
    const troll = await createUser('troll')
    const post = await createPost(author)
    const comment = await request.post(`/posts/${post.id}/comments`).set(troll.auth).send({ body: 'Insulto' })
    await flag(author, { targetType: 'comment', targetId: comment.body.id })

    await remove(admin, 'post', post.id)
    expect(await pending(admin)).toEqual([])
  })

  it('borrar un perfil elimina la cuenta y todo lo suyo, y cierra sus denuncias', async () => {
    const admin = await createAdmin()
    const troll = await createUser('troll')
    const neighbour = await createUser('vecina')
    const post = await createPost(troll)
    const neighbourPost = await createPost(neighbour)
    await request.post(`/posts/${neighbourPost.id}/comments`).set(troll.auth).send({ body: 'Insulto' })
    await flag(neighbour, { targetType: 'post', targetId: post.id })
    await flag(neighbour, { targetType: 'user', username: 'troll' })

    expect((await request.delete('/admin/users/Troll').set(admin.auth).send(decision)).status).toBe(204)
    expect((await request.get('/users/troll')).status).toBe(404)
    expect((await request.get(`/posts/${post.id}`)).status).toBe(404)
    expect((await request.get(`/posts/${neighbourPost.id}`)).status).toBe(200)
    expect((await request.get(`/posts/${neighbourPost.id}/comments`)).body).toEqual([])
    expect(await pending(admin)).toEqual([])
  })

  it('una cuenta borrada deja de funcionar aunque su token no haya caducado', async () => {
    const admin = await createAdmin()
    const troll = await createUser('troll')
    await request.delete('/admin/users/troll').set(admin.auth).send(decision)

    const res = await request.post('/flags').set(troll.auth).send({ targetType: 'user', username: 'nabil', reason: 'spam' })
    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/ya no existe/)
  })

  it('borrar perfiles: solo moderadores, y nunca el propio ni el de otro moderador', async () => {
    const admin = await createAdmin()
    await createAdmin('moderadora')
    const user = await createUser('vecina')
    await createUser('otra')

    expect((await request.delete('/admin/users/otra')).status).toBe(401)
    expect((await request.delete('/admin/users/otra').set(user.auth)).status).toBe(403)
    expect((await request.delete('/admin/users/nabil').set(admin.auth).send(decision)).status).toBe(400)
    expect((await request.delete('/admin/users/moderadora').set(admin.auth).send(decision)).status).toBe(400)
    expect((await request.delete('/admin/users/nadie').set(admin.auth).send(decision)).status).toBe(404)
    expect((await request.get('/users/otra')).status).toBe(200)
  })

  it('si lo borrado estaba denunciado, sus denuncias quedan resueltas', async () => {
    const admin = await createAdmin()
    const author = await createUser('autora')
    const reporter = await createUser('vecina')
    const post = await createPost(author)
    await flag(reporter, { targetType: 'post', targetId: post.id })

    await remove(admin, 'post', post.id)
    expect(await pending(admin)).toEqual([])
    expect((await request.get('/admin/flags/count').set(admin.auth)).body).toEqual({ pending: 0 })
  })

  it('solo pueden los moderadores: ni siquiera el autor entra por esta ruta', async () => {
    const author = await createUser('autora')
    const post = await createPost(author)

    expect((await request.delete(`/admin/content/post/${post.id}`)).status).toBe(401)
    expect((await remove(author, 'post', post.id)).status).toBe(403)
    expect((await request.get(`/posts/${post.id}`)).status).toBe(200)
  })

  it('lo que no existe da 404, y los perfiles y las conversaciones no se borran', async () => {
    const admin = await createAdmin()
    const user = await createUser('vecina')

    expect((await remove(admin, 'post', user.id)).status).toBe(404)
    expect((await remove(admin, 'user', user.id)).status).toBe(400)
    expect((await remove(admin, 'conversation', user.id)).status).toBe(400)
    expect((await remove(admin, 'post', 'no-es-un-uuid')).status).toBe(400)
  })

  it('suspende y readmite desde el perfil, y las denuncias de ese perfil quedan resueltas', async () => {
    const admin = await createAdmin()
    const troll = await createUser('troll')
    const reporter = await createUser('vecina')
    await flag(reporter, { targetType: 'user', username: 'troll' })

    expect((await request.put('/admin/suspended/Troll').set(admin.auth).send(decision)).status).toBe(204)
    expect((await request.get('/me').set(troll.auth)).status).toBe(403)
    expect(await pending(admin)).toEqual([])

    expect((await request.delete('/admin/suspended/troll').set(admin.auth)).status).toBe(204)
    expect((await request.get('/me').set(troll.auth)).status).toBe(200)
  })

  it('suspender desde el perfil: solo moderadores, y nunca a uno mismo ni a otro moderador', async () => {
    const admin = await createAdmin()
    await createAdmin('moderadora')
    const user = await createUser('vecina')

    expect((await request.put('/admin/suspended/vecina').set(user.auth).send(decision)).status).toBe(403)
    expect((await request.put('/admin/suspended/nabil').set(admin.auth).send(decision)).status).toBe(400)
    expect((await request.put('/admin/suspended/moderadora').set(admin.auth).send(decision)).status).toBe(400)
    expect((await request.put('/admin/suspended/nadie').set(admin.auth).send(decision)).status).toBe(404)
  })
})

describe('registro de moderación y aviso al afectado', () => {
  const removePost = (user: TestUser, id: string, body: object = decision) => request.delete(`/admin/content/post/${id}`).set(user.auth).send(body)
  const log = async (admin: TestUser) => (await request.get('/admin/log').set(admin.auth)).body.entries
  const notices = async (user: TestUser) =>
    (await request.get('/notifications').set(user.auth)).body.notifications.filter((n: { type: string }) => n.type === 'moderation_notice')

  it('apunta quién borró qué y por qué, aunque lo borrado ya no exista', async () => {
    const admin = await createAdmin()
    const author = await createUser('autora')
    const post = await createPost(author)

    await removePost(admin, post.id, { reason: 'fake', note: 'Foto robada' })

    expect(await log(admin)).toEqual([
      expect.objectContaining({
        action: 'remove',
        targetType: 'post',
        targetLabel: 'Publicación de Luna',
        reason: 'fake',
        note: 'Foto robada',
        moderator: { username: 'nabil' },
        targetUser: { username: 'autora' },
      }),
    ])
  })

  it('explica el motivo al autor, sin la nota interna y aunque haya bloqueado al moderador', async () => {
    const admin = await createAdmin()
    const author = await createUser('autora')
    const post = await createPost(author)
    await request.put('/users/nabil/block').set(author.auth)

    await removePost(admin, post.id, { reason: 'spam', note: 'Reincidente' })

    const [notice] = await notices(author)
    expect(notice.message).toBe('Hemos retirado tu publicación de Luna por spam o publicidad.')
    expect(notice.actor).toBeNull()
  })

  it('no hay decisión sin motivo', async () => {
    const admin = await createAdmin()
    const author = await createUser('autora')
    const post = await createPost(author)

    expect((await removePost(admin, post.id, {})).status).toBe(400)
    expect((await request.get(`/posts/${post.id}`)).status).toBe(200)
  })

  it('a un moderador no se le avisa de lo que borra él mismo', async () => {
    const admin = await createAdmin()
    const post = await createPost(admin)

    await removePost(admin, post.id)
    expect(await notices(admin)).toEqual([])
  })

  it('lo decidido en el panel se apunta con el motivo de la denuncia', async () => {
    const admin = await createAdmin()
    const author = await createUser('autora')
    const reporter = await createUser('vecina')
    const removed = await createPost(author)
    const kept = await createPost(author)
    await flag(reporter, { targetType: 'post', targetId: removed.id, reason: 'inappropriate' })
    await flag(reporter, { targetType: 'post', targetId: kept.id, reason: 'fake' })

    const resolve = (targetId: string, action: string) => request.post('/admin/flags/resolve').set(admin.auth).send({ targetType: 'post', targetId, action })
    await resolve(removed.id, 'remove')
    await resolve(kept.id, 'dismiss')

    const [dismissed, remove] = await log(admin)
    expect(remove).toMatchObject({ action: 'remove', reason: 'inappropriate' })
    expect(dismissed).toMatchObject({ action: 'dismiss', reason: 'fake', targetLabel: 'Publicación de Luna' })
    expect(await notices(author)).toHaveLength(1)
  })

  it('apunta suspender, readmitir y borrar cuentas, aunque la cuenta ya no exista', async () => {
    const admin = await createAdmin()
    await createUser('troll')

    await request.put('/admin/suspended/troll').set(admin.auth).send(decision)
    await request.delete('/admin/suspended/troll').set(admin.auth)
    await request.delete('/admin/users/troll').set(admin.auth).send({ reason: 'other', note: 'Cuenta falsa' })

    const entries = await log(admin)
    expect(entries.map((e: { action: string }) => e.action)).toEqual(['delete_account', 'unsuspend', 'suspend'])
    expect(entries.map((e: { targetLabel: string }) => e.targetLabel)).toEqual(['@troll', '@troll', '@troll'])
    expect(entries[0]).toMatchObject({ reason: 'other', note: 'Cuenta falsa', targetUser: null })
  })

  it('el historial es solo para moderadores y va por páginas', async () => {
    const admin = await createAdmin()
    const user = await createUser('vecina')
    expect((await request.get('/admin/log')).status).toBe(401)
    expect((await request.get('/admin/log').set(user.auth)).status).toBe(403)

    const first = (await request.get('/admin/log').set(admin.auth)).body
    expect(first).toEqual({ entries: [], nextCursor: null })
  })
})
