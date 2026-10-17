import { randomUUID } from 'node:crypto'
import { beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '../src/lib/prisma.js'
import { signToken } from './keys.js'
import { createUser, request } from './helpers.js'

// auth.users solo existe en Supabase. Para probar el trigger que crea el perfil se engancha
// la misma función a una tabla con las columnas que usa (id, email y metadatos).
beforeAll(async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS fake_auth_users (id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb)`)
  await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS on_fake_auth_user_created ON fake_auth_users')
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER on_fake_auth_user_created AFTER INSERT ON fake_auth_users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user()`)
})

/** Simula el alta en Supabase Auth y devuelve el perfil que crea el trigger. */
async function signUpWith(email: string, meta: Record<string, string>) {
  const id = randomUUID()
  await prisma.$executeRaw`INSERT INTO fake_auth_users (id, email, raw_user_meta_data) VALUES (${id}::uuid, ${email}, ${JSON.stringify(meta)}::jsonb)`
  const user = await prisma.user.findUniqueOrThrow({ where: { id } })
  return { ...user, auth: { Authorization: `Bearer ${await signToken(id)}` } }
}

describe('registro con Google o Apple', () => {
  it('con email y formulario, el username es el elegido y ya está confirmado', async () => {
    const user = await signUpWith('nabil@example.com', { username: 'Nabil', display_name: 'Nabil D.' })
    expect(user).toMatchObject({ username: 'nabil', displayName: 'Nabil D.', usernameConfirmed: true })
  })

  it('con Google, el username es provisional, sale del email y no se repite', async () => {
    await createUser('jose_perez')
    const user = await signUpWith('José.Pérez@gmail.com', { full_name: 'José Pérez', avatar_url: 'https://lh3.googleusercontent.com/x' })
    expect(user.displayName).toBe('José Pérez')
    expect(user.usernameConfirmed).toBe(false)
    expect(user.username).toMatch(/^jose_perez_\d{4}$/)

    // Emails raros (o el relay de Apple) siempre dan un username válido.
    const weird = await signUpWith('..@privaterelay.appleid.com', {})
    expect(weird.username).toMatch(/^[a-z0-9_]{3,30}$/)
    expect(weird.displayName).toBe('..')
  })

  it('la primera vez elige su username; después ya no se puede cambiar', async () => {
    const user = await signUpWith('ana@gmail.com', { full_name: 'Ana García' })
    await createUser('cogido')
    expect((await request.get('/me').set(user.auth)).body).toMatchObject({ username: 'ana', usernameConfirmed: false })

    const taken = await request.put('/me/username').set(user.auth).send({ username: 'cogido', displayName: 'Ana' })
    expect(taken.status).toBe(409)
    const invalid = await request.put('/me/username').set(user.auth).send({ username: 'a b', displayName: 'Ana' })
    expect(invalid.status).toBe(400)

    const ok = await request.put('/me/username').set(user.auth).send({ username: 'Ana_G', displayName: 'Ana García' })
    expect(ok.body).toMatchObject({ username: 'ana_g', displayName: 'Ana García', usernameConfirmed: true })

    const again = await request.put('/me/username').set(user.auth).send({ username: 'otra', displayName: 'Ana' })
    expect(again.status).toBe(409)
  })

  it('quien se registró con email no puede usar esta ruta para cambiarse el username', async () => {
    const user = await createUser('nabil')
    expect((await request.put('/me/username').set(user.auth).send({ username: 'otro', displayName: 'X' })).status).toBe(409)
  })
})
