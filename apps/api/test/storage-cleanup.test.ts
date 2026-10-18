import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '../src/lib/prisma.js'
import { createPet, createUser, mediaUrl, request } from './helpers.js'

// storage.objects solo existe en Supabase: aquí una tabla con las columnas que usa la limpieza.
beforeAll(async () => {
  await prisma.$executeRawUnsafe('CREATE SCHEMA IF NOT EXISTS storage')
  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS storage.objects (bucket_id text, name text, created_at timestamptz DEFAULT now())',
  )
})
beforeEach(async () => {
  await prisma.$executeRawUnsafe('TRUNCATE storage.objects')
})
afterEach(() => {
  vi.restoreAllMocks()
})

/** Una foto "subida" hace `hoursAgo` horas. */
async function storedPhoto(url: string, hoursAgo: number) {
  const name = url.split('/object/public/media/')[1]
  await prisma.$executeRaw`
    INSERT INTO storage.objects (bucket_id, name, created_at)
    VALUES ('media', ${name}, now() - make_interval(hours => ${hoursAgo}))`
  return name
}

const cron = () => request.get('/cron/storage-cleanup').set('Authorization', 'Bearer secreto-de-prueba')

describe('limpieza de fotos huérfanas', () => {
  it('borra solo las que no usa nadie y tienen más de un día', async () => {
    const user = await createUser('nabil')
    const pet = await createPet(user)
    const usedUrl = mediaUrl(user.id)
    await prisma.pet.update({ where: { id: pet.id }, data: { photoUrl: usedUrl } })

    await storedPhoto(usedUrl, 48)
    const orphan = await storedPhoto(mediaUrl(user.id), 48)
    await storedPhoto(mediaUrl(user.id), 2) // recién subida: quizá está a medio publicar

    const calls: { url: string; body: unknown; auth: string }[] = []
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const headers = init?.headers as Record<string, string>
      calls.push({ url: String(input), body: JSON.parse(String(init?.body)), auth: headers.Authorization })
      return new Response('[]', { status: 200 })
    })

    const res = await cron()
    expect(res.body).toEqual({ deleted: 1 })
    expect(calls).toEqual([
      {
        url: 'http://supabase.test/storage/v1/object/media',
        body: { prefixes: [orphan] },
        auth: 'Bearer clave-de-servicio-de-prueba',
      },
    ])
  })

  it('sin el secreto del cron no hace nada', async () => {
    expect((await request.get('/cron/storage-cleanup')).status).toBe(401)
    expect((await request.get('/cron/storage-cleanup').set('Authorization', 'Bearer otro')).status).toBe(401)
  })
})
