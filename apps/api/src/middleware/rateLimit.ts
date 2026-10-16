import type { Request } from 'express'
import { rateLimit } from 'express-rate-limit'
import { env } from '../lib/env.js'

const WINDOW_MS = 15 * 60 * 1000
const isRead = (req: Request) => req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS'

const common = {
  windowMs: WINDOW_MS,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones. Espera unos minutos y vuelve a intentarlo.' },
} as const

/** Límite general por IP para cualquier petición. */
export const apiLimiter = rateLimit({
  ...common,
  limit: 300,
  skip: () => !env.RATE_LIMIT_ENABLED,
})

/** Límite más estricto para escrituras (crear avisos, avistamientos...), contra spam. */
export const writeLimiter = rateLimit({
  ...common,
  limit: 60,
  skip: (req) => !env.RATE_LIMIT_ENABLED || isRead(req),
})
