import { describe, expect, it } from 'vitest'
import { createPet, createUser, mediaUrl, request, type TestUser } from './helpers.js'

async function createPost(user: TestUser, petId: string, caption = 'Paseo por el Retiro') {
  const res = await request.post('/posts').set(user.auth).send({ petId, imageUrl: mediaUrl(user.id), caption })
  if (res.status !== 201) throw new Error(`createPost: ${res.status} ${JSON.stringify(res.body)}`)
  return res.body as { id: string }
}

const ids = (body: { posts: { id: string }[] }) => body.posts.map((p) => p.id)

describe('publicaciones', () => {
  it('publica con una mascota y una foto propias, y aparece en explorar', async () => {
    const owner = await createUser('nabil')
    const pet = await createPet(owner)
    const post = await createPost(owner, pet.id)

    const res = await request.get('/posts')
    expect(res.status).toBe(200)
    expect(res.body.posts[0]).toMatchObject({
      id: post.id,
      caption: 'Paseo por el Retiro',
      pet: { id: pet.id, name: 'Luna', owner: { username: 'nabil' } },
      likesCount: 0,
      commentsCount: 0,
      likedByMe: false,
    })
    expect(res.body.nextCursor).toBeNull()
  })

  it('no deja publicar con mascotas ajenas ni con fotos de otra carpeta', async () => {
    const owner = await createUser('nabil')
    const other = await createUser('otra')
    const othersPet = await createPet(other)
    const myPet = await createPet(owner)

    const foreignPet = await request.post('/posts').set(owner.auth).send({ petId: othersPet.id, imageUrl: mediaUrl(owner.id) })
    expect(foreignPet.status).toBe(404)
    const foreignPhoto = await request.post('/posts').set(owner.auth).send({ petId: myPet.id, imageUrl: mediaUrl(other.id) })
    expect(foreignPhoto.status).toBe(400)
    expect((await request.post('/posts').send({ petId: myPet.id, imageUrl: mediaUrl(owner.id) })).status).toBe(401)
  })

  it('solo el dueño de la mascota puede borrar la publicación (y se van sus likes y comentarios)', async () => {
    const owner = await createUser('nabil')
    const other = await createUser('otra')
    const post = await createPost(owner, (await createPet(owner)).id)
    await request.put(`/posts/${post.id}/like`).set(other.auth)
    await request.post(`/posts/${post.id}/comments`).set(other.auth).send({ body: '¡Qué bonita!' })

    expect((await request.delete(`/posts/${post.id}`).set(other.auth)).status).toBe(404)
    expect((await request.delete(`/posts/${post.id}`).set(owner.auth)).status).toBe(204)
    expect((await request.get(`/posts/${post.id}`)).status).toBe(404)
  })

  it('pagina por cursor sin repetir ni saltarse publicaciones', async () => {
    const owner = await createUser('nabil')
    const pet = await createPet(owner)
    const created: string[] = []
    for (let i = 0; i < 14; i++) created.push((await createPost(owner, pet.id, `Post ${i}`)).id)

    const first = await request.get('/posts')
    expect(first.body.posts).toHaveLength(12)
    expect(first.body.nextCursor).toBe(first.body.posts[11].id)

    const second = await request.get('/posts').query({ cursor: first.body.nextCursor })
    expect(second.body.posts).toHaveLength(2)
    expect(second.body.nextCursor).toBeNull()
    // Más recientes primero y ninguna repetida.
    expect([...ids(first.body), ...ids(second.body)]).toEqual([...created].reverse())
  })
})

describe('likes', () => {
  it('son idempotentes y cada usuario ve si ha dado like', async () => {
    const owner = await createUser('nabil')
    const fan = await createUser('fan')
    const post = await createPost(owner, (await createPet(owner)).id)

    await request.put(`/posts/${post.id}/like`).set(fan.auth)
    const again = await request.put(`/posts/${post.id}/like`).set(fan.auth)
    expect(again.body).toEqual({ likesCount: 1, likedByMe: true })

    expect((await request.get(`/posts/${post.id}`).set(fan.auth)).body.likedByMe).toBe(true)
    expect((await request.get(`/posts/${post.id}`).set(owner.auth)).body.likedByMe).toBe(false)
    expect((await request.get(`/posts/${post.id}`)).body).toMatchObject({ likesCount: 1, likedByMe: false })

    const removed = await request.delete(`/posts/${post.id}/like`).set(fan.auth)
    expect(removed.body).toEqual({ likesCount: 0, likedByMe: false })
    expect((await request.delete(`/posts/${post.id}/like`).set(fan.auth)).status).toBe(200)
  })
})

describe('comentarios', () => {
  it('se listan en orden y los borra su autor o el dueño de la publicación', async () => {
    const owner = await createUser('nabil')
    const author = await createUser('autora')
    const stranger = await createUser('extrano')
    const post = await createPost(owner, (await createPet(owner)).id)

    expect((await request.post(`/posts/${post.id}/comments`).set(author.auth).send({ body: '  ' })).status).toBe(400)
    const first = await request.post(`/posts/${post.id}/comments`).set(author.auth).send({ body: 'Primero' })
    const second = await request.post(`/posts/${post.id}/comments`).set(author.auth).send({ body: 'Segundo' })
    expect(first.status).toBe(201)
    expect(first.body.user.username).toBe('autora')

    const list = await request.get(`/posts/${post.id}/comments`)
    expect(list.body.map((c: { body: string }) => c.body)).toEqual(['Primero', 'Segundo'])
    expect((await request.get(`/posts/${post.id}`)).body.commentsCount).toBe(2)

    expect((await request.delete(`/posts/${post.id}/comments/${first.body.id}`).set(stranger.auth)).status).toBe(404)
    expect((await request.delete(`/posts/${post.id}/comments/${first.body.id}`).set(author.auth)).status).toBe(204)
    expect((await request.delete(`/posts/${post.id}/comments/${second.body.id}`).set(owner.auth)).status).toBe(204)
    expect((await request.get(`/posts/${post.id}/comments`)).body).toEqual([])
  })
})

describe('seguir mascotas y feed', () => {
  it('el feed tiene lo de las mascotas que sigo y lo de las mías, y nada más', async () => {
    const me = await createUser('nabil')
    const friend = await createUser('amiga')
    const stranger = await createUser('extrano')
    const myPost = await createPost(me, (await createPet(me)).id)
    const friendsPet = await createPet(friend, { name: 'Toby', species: 'cat' })
    const friendsPost = await createPost(friend, friendsPet.id)
    await createPost(stranger, (await createPet(stranger)).id)

    expect(ids((await request.get('/feed').set(me.auth)).body)).toEqual([myPost.id])

    const followed = await request.put(`/pets/${friendsPet.id}/follow`).set(me.auth)
    expect(followed.body).toEqual({ followersCount: 1, postsCount: 1, followedByMe: true })
    expect(ids((await request.get('/feed').set(me.auth)).body)).toEqual([friendsPost.id, myPost.id])

    const pet = await request.get(`/pets/${friendsPet.id}`).set(me.auth)
    expect(pet.body).toMatchObject({ name: 'Toby', followersCount: 1, followedByMe: true })
    expect((await request.get(`/pets/${friendsPet.id}`)).body.followedByMe).toBe(false)

    await request.delete(`/pets/${friendsPet.id}/follow`).set(me.auth)
    expect(ids((await request.get('/feed').set(me.auth)).body)).toEqual([myPost.id])
    expect((await request.get('/feed')).status).toBe(401)
  })

  it('no se puede seguir a las mascotas propias y seguir dos veces no duplica', async () => {
    const me = await createUser('nabil')
    const friend = await createUser('amiga')
    const mine = await createPet(me)
    const theirs = await createPet(friend)

    expect((await request.put(`/pets/${mine.id}/follow`).set(me.auth)).status).toBe(400)
    await request.put(`/pets/${theirs.id}/follow`).set(me.auth)
    const again = await request.put(`/pets/${theirs.id}/follow`).set(me.auth)
    expect(again.body.followersCount).toBe(1)
  })

  it('lista las publicaciones de una mascota', async () => {
    const owner = await createUser('nabil')
    const luna = await createPet(owner)
    const toby = await createPet(owner, { name: 'Toby' })
    const post = await createPost(owner, luna.id)
    await createPost(owner, toby.id)

    expect(ids((await request.get(`/pets/${luna.id}/posts`)).body)).toEqual([post.id])
  })
})
