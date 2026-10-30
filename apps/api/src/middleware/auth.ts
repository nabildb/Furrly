import type { NextFunction, Request, Response } from 'express'
import { jwtVerify } from 'jose'
import { issuer, jwks } from '../lib/jwks.js'
import { prisma } from '../lib/prisma.js'

declare global {
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}

const dayFormat = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' })

async function verify(header: string) {
  const { payload } = await jwtVerify(header.slice('Bearer '.length), jwks, {
    issuer,
    audience: 'authenticated',
  })
  if (!payload.sub) throw new Error('Token sin sub')
  return payload.sub
}

/** Exige un access token válido de Supabase y deja el id del usuario en req.userId. */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Falta el token de autenticación' })
    return
  }

  let userId: string
  try {
    userId = await verify(header)
  } catch {
    res.status(401).json({ error: 'Token inválido o caducado' })
    return
  }

  // Una cuenta suspendida o borrada no puede hacer nada, aunque su token aún no haya caducado.
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { suspendedAt: true, suspendedUntil: true } })
  if (!user) {
    res.status(401).json({ error: 'Esta cuenta ya no existe' })
    return
  }
  if (user.suspendedAt) {
    // Una suspensión temporal ya cumplida se limpia con la primera petición de esa cuenta.
    if (!user.suspendedUntil || user.suspendedUntil > new Date()) {
      const until = user.suspendedUntil ? ` hasta el ${dayFormat.format(user.suspendedUntil)}` : ''
      res.status(403).json({ error: `Tu cuenta está suspendida${until} por incumplir las normas de Furrly.` })
      return
    }
    await prisma.user.update({ where: { id: userId }, data: { suspendedAt: null, suspendedUntil: null } })
  }
  req.userId = userId
  next()
}

/** Como requireAuth, pero además exige ser administrador. */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  await requireAuth(req, res, async () => {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { isAdmin: true } })
    if (!user?.isAdmin) {
      res.status(403).json({ error: 'Solo para moderadores' })
      return
    }
    next()
  })
}

/**
 * Para rutas públicas que cambian un poco si hay sesión (p. ej. "le has dado like").
 * Sin token sigue como anónimo; con un token inválido responde 401, igual que requireAuth,
 * para que el cliente se entere de que su sesión ha caducado.
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.headers.authorization) return next()
  return requireAuth(req, res, next)
}
