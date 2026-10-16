import type { NextFunction, Request, Response } from 'express'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { env } from '../lib/env.js'

// Supabase Auth firma los access tokens con claves asimétricas y publica las
// públicas en este endpoint. jose las cachea y las refresca si rotan.
const issuer = `${env.SUPABASE_URL}/auth/v1`
const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`))

declare global {
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}

/** Exige un access token válido de Supabase y deja el id del usuario en req.userId. */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Falta el token de autenticación' })
    return
  }

  try {
    const { payload } = await jwtVerify(header.slice('Bearer '.length), jwks, {
      issuer,
      audience: 'authenticated',
    })
    if (!payload.sub) throw new Error('Token sin sub')
    req.userId = payload.sub
    next()
  } catch {
    res.status(401).json({ error: 'Token inválido o caducado' })
  }
}
