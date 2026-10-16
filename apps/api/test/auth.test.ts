import { describe, expect, it } from 'vitest'
import { createUser, request } from './helpers.js'
import { signToken } from './keys.js'

describe('autenticación', () => {
  it('rechaza peticiones sin token', async () => {
    const res = await request.get('/me')
    expect(res.status).toBe(401)
  })

  it('rechaza tokens mal formados', async () => {
    const res = await request.get('/me').set('Authorization', 'Bearer no-es-un-jwt')
    expect(res.status).toBe(401)
  })

  it('rechaza tokens de otro emisor, otra audiencia o caducados', async () => {
    const user = await createUser('nabil')
    for (const token of [
      await signToken(user.id, { issuer: 'https://otro.supabase.co/auth/v1' }),
      await signToken(user.id, { audience: 'anon' }),
      await signToken(user.id, { expiresIn: '-1m' }),
    ]) {
      const res = await request.get('/me').set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(401)
    }
  })

  it('devuelve el perfil del usuario autenticado', async () => {
    const user = await createUser('nabil')
    const res = await request.get('/me').set(user.auth)
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ id: user.id, username: 'nabil', alertRadiusKm: 5 })
  })
})

describe('GET /usernames/:username/available', () => {
  it('indica si el nombre de usuario está libre', async () => {
    await createUser('nabil')
    expect((await request.get('/usernames/nabil/available')).body).toEqual({ available: false })
    expect((await request.get('/usernames/otro_user/available')).body).toEqual({ available: true })
  })

  it('valida el formato igual que el CHECK de la BD', async () => {
    const res = await request.get('/usernames/Con%20Espacios/available')
    expect(res.status).toBe(400)
  })
})
