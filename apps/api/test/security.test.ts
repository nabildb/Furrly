import { generateKeyPair, SignJWT } from 'jose'
import { describe, expect, it } from 'vitest'
import { prisma } from '../src/lib/prisma.js'
import { createPet, createUser, mediaUrl, minutesAgo, request, SOL } from './helpers.js'
import { TEST_ISSUER } from './keys.js'

// Cadenas típicas de inyección SQL. Si alguna llegara a pegarse dentro del SQL, romperían la
// consulta o devolverían datos de más; como todo va parametrizado, son texto sin más.
const SQL_PAYLOADS = ["nabil' OR '1'='1", "x'; DROP TABLE users; --", '1 OR 1=1', "' UNION SELECT * FROM users --"]

const encode = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')

describe('tokens manipulados', () => {
  it('rechaza un token firmado con otra clave, uno sin firma (alg none) y uno con el usuario cambiado', async () => {
    const user = await createUser('nabil')
    const claims = { sub: user.id, aud: 'authenticated', iss: TEST_ISSUER, exp: Math.floor(Date.now() / 1000) + 3600 }

    const { privateKey } = await generateKeyPair('ES256')
    const forged = await new SignJWT(claims).setProtectedHeader({ alg: 'ES256', kid: 'test' }).sign(privateKey)
    const unsigned = `${encode({ alg: 'none', typ: 'JWT' })}.${encode(claims)}.`
    const [header, , signature] = user.auth.Authorization.slice('Bearer '.length).split('.')
    const tampered = `${header}.${encode({ ...claims, sub: crypto.randomUUID() })}.${signature}`

    for (const token of [forged, unsigned, tampered]) {
      expect((await request.get('/me').set('Authorization', `Bearer ${token}`)).status).toBe(401)
    }
  })
})

describe('inyección SQL', () => {
  it('en rutas y parámetros: se valida o no encuentra nada, y la BD sigue intacta', async () => {
    const user = await createUser('nabil')
    for (const payload of SQL_PAYLOADS) {
      const encoded = encodeURIComponent(payload)
      expect((await request.get(`/users/${encoded}`)).status).toBe(404)
      expect((await request.get(`/usernames/${encoded}/available`)).status).toBe(400)
      expect((await request.get('/reports').query({ ...SOL, type: payload })).status).toBe(400)
      expect((await request.get('/reports').query({ lat: payload, lng: SOL.lng })).status).toBe(400)
      expect((await request.get(`/pets/${encoded}`)).status).toBe(400)
      expect((await request.post('/conversations').set(user.auth).send({ username: payload, body: 'Hola' })).status).toBe(404)
    }
    expect(await prisma.user.count()).toBe(1)
  })

  it('en textos: se guardan tal cual, como texto', async () => {
    const user = await createUser('nabil')
    const pet = await createPet(user, { name: "Luna'; DROP TABLE pets; --" })
    const post = await request.post('/posts').set(user.auth).send({ petId: pet.id, imageUrl: mediaUrl(user.id) })
    const body = "'); DELETE FROM comments; --"
    await request.post(`/posts/${post.body.id}/comments`).set(user.auth).send({ body })

    expect((await request.get(`/pets/${pet.id}`)).body.name).toBe("Luna'; DROP TABLE pets; --")
    expect((await request.get(`/posts/${post.body.id}/comments`)).body[0].body).toBe(body)
  })
})

describe('asignación masiva', () => {
  it('no se pueden colar campos que no son editables (dueño, autor, username, estado)', async () => {
    const me = await createUser('nabil')
    const other = await createUser('otra')

    await request.patch('/me').set(me.auth).send({ username: 'admin', id: other.id, displayName: 'Nabil' })
    expect((await request.get('/me').set(me.auth)).body).toMatchObject({ username: 'nabil', displayName: 'Nabil' })

    const pet = await createPet(me)
    await request.patch(`/pets/${pet.id}`).set(me.auth).send({ ownerId: other.id, name: 'Luna' })
    expect((await request.get(`/pets/${pet.id}`)).body.owner.username).toBe('nabil')

    const report = await request
      .post('/reports')
      .set(me.auth)
      .send({
        type: 'found',
        species: 'cat',
        title: 'Gato encontrado',
        description: 'Gato atigrado muy sociable',
        ...SOL,
        happenedAt: minutesAgo(10),
        reporterId: other.id,
        status: 'resolved',
      })
    expect(report.body).toMatchObject({ status: 'active', reporter: { username: 'nabil' } })
  })
})

describe('peticiones malformadas', () => {
  it('JSON roto da 400 y un cuerpo enorme da 413, no un error 500', async () => {
    const user = await createUser('nabil')
    const broken = await request.patch('/me').set(user.auth).set('Content-Type', 'application/json').send('{"bio": ')
    expect(broken.status).toBe(400)
    const huge = await request.patch('/me').set(user.auth).send({ bio: 'x'.repeat(200_000) })
    expect(huge.status).toBe(413)
  })
})
