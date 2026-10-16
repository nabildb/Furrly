import { afterAll, beforeEach, vi } from 'vitest'
import { prisma } from '../src/lib/prisma.js'

// En vez de descargar las claves de Supabase, la API valida con las de test/keys.ts.
vi.mock('../src/lib/jwks.js', async () => {
  const { createLocalJWKSet } = await import('jose')
  const { publicJwks, TEST_ISSUER } = await import('./keys.js')
  return { issuer: TEST_ISSUER, jwks: createLocalJWKSet(publicJwks) }
})

// Cada test empieza con la BD vacía. Al truncar users, CASCADE vacía todo lo que depende de él.
beforeEach(async () => {
  await prisma.$executeRawUnsafe('TRUNCATE users CASCADE')
})

afterAll(async () => {
  await prisma.$disconnect()
})
