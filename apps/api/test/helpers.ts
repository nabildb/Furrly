import { randomUUID } from 'node:crypto'
import supertest from 'supertest'
import { app } from '../src/app.js'
import { prisma } from '../src/lib/prisma.js'
import { signToken } from './keys.js'

export const request = supertest(app)

export interface TestUser {
  id: string
  username: string
  auth: { Authorization: string }
}

/** Crea el perfil directamente (en producción lo hace el trigger de auth.users) y su token. */
export async function createUser(username: string): Promise<TestUser> {
  const id = randomUUID()
  await prisma.user.create({ data: { id, username, displayName: username } })
  return { id, username, auth: { Authorization: `Bearer ${await signToken(id)}` } }
}

/** URL de una foto "subida" a la carpeta de un usuario en el bucket media. */
export function mediaUrl(userId: string, file = `${randomUUID()}.png`) {
  return `http://supabase.test/storage/v1/object/public/media/${userId}/${file}`
}

export const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()

// Puntos de Madrid para las búsquedas por radio.
export const SOL = { lat: 40.4168, lng: -3.7038 }
export const RETIRO = { lat: 40.4153, lng: -3.6845 } // ~1,6 km de Sol
export const ALCALA = { lat: 40.4818, lng: -3.3643 } // Alcalá de Henares, ~30 km

export async function createPet(user: TestUser, body: Record<string, unknown> = {}) {
  const res = await request.post('/pets').set(user.auth).send({ name: 'Luna', species: 'dog', ...body })
  if (res.status !== 201) throw new Error(`createPet: ${res.status} ${JSON.stringify(res.body)}`)
  return res.body as { id: string }
}

export async function createLostReport(user: TestUser, petId: string, body: Record<string, unknown> = {}) {
  const res = await request
    .post('/reports')
    .set(user.auth)
    .send({
      type: 'lost',
      petId,
      title: 'Se ha perdido Luna',
      description: 'Beagle tricolor con collar azul',
      ...SOL,
      happenedAt: minutesAgo(120),
      ...body,
    })
  if (res.status !== 201) throw new Error(`createLostReport: ${res.status} ${JSON.stringify(res.body)}`)
  return res.body as { id: string }
}
