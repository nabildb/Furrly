import { z } from 'zod'

// Falla al arrancar si falta alguna variable, en vez de fallar a mitad de una petición.
const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.url(),
  SUPABASE_URL: z.url(),
})

export const env = envSchema.parse(process.env)
