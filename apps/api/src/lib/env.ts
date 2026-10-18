import { z } from 'zod'

// Falla al arrancar si falta alguna variable, en vez de fallar a mitad de una petición.
const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  // Uno o varios orígenes separados por comas (p. ej. producción y localhost).
  CORS_ORIGIN: z
    .string()
    .default('http://localhost:5173')
    .transform((v) => v.split(',').map((o) => o.trim()).filter(Boolean)),
  DATABASE_URL: z.url(),
  SUPABASE_URL: z.url(),
  // Detrás de un proxy (Render, etc.) la IP real viene en X-Forwarded-For: nº de proxies de confianza.
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  // Web Push (VAPID). Si faltan, la app funciona igual pero sin avisos push (p. ej. en local).
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default('https://furrly-rouge.vercel.app'),
  // Dirección pública de la web: para las URLs absolutas de las vistas previas al compartir.
  PUBLIC_SITE_URL: z.url().default('https://furrly-rouge.vercel.app'),
  // Limpieza de fotos huérfanas (cron nocturno de Vercel). Sin ellas, la limpieza no se hace.
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  RATE_LIMIT_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
})

export const env = envSchema.parse(process.env)
