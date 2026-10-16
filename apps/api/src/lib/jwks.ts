import { createRemoteJWKSet } from 'jose'
import { env } from './env.js'

// Supabase Auth firma los access tokens con claves asimétricas y publica las
// públicas en este endpoint. jose las cachea y las refresca si rotan.
// Está en su propio módulo para que los tests puedan sustituirlo por claves locales.
export const issuer = `${env.SUPABASE_URL}/auth/v1`
export const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`))
