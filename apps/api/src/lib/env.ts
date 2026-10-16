import { z } from 'zod'

// Falla al arrancar si falta alguna variable, en vez de fallar a mitad de una petición.
const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.url(),
  SUPABASE_URL: z.url(),
  // Detrás de un proxy (Render, etc.) la IP real viene en X-Forwarded-For: nº de proxies de confianza.
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  RATE_LIMIT_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
})

export const env = envSchema.parse(process.env)
