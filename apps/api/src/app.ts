import cors from 'cors'
import express, { type RequestHandler } from 'express'
import helmet from 'helmet'
import { env } from './lib/env.js'
import { errorHandler } from './lib/http.js'
import { apiLimiter, writeLimiter } from './middleware/rateLimit.js'
import { adminRouter } from './routes/admin.js'
import { conversationsRouter, inboxRouter } from './routes/conversations.js'
import { cronRouter } from './routes/cron.js'
import { flagsRouter } from './routes/flags.js'
import { geocodeRouter } from './routes/geocode.js'
import { meRouter } from './routes/me.js'
import { notificationsRouter } from './routes/notifications.js'
import { pushRouter } from './routes/push.js'
import { myPetsRouter, petsRouter, userPetsRouter } from './routes/pets.js'
import { feedRouter, postsRouter } from './routes/posts.js'
import { myReportsRouter, reportsRouter } from './routes/reports.js'
import { shareRouter } from './routes/share.js'
import { sightingsRouter } from './routes/sightings.js'
import { usernamesRouter } from './routes/usernames.js'
import { usersRouter } from './routes/users.js'

/**
 * Apunta bajo qué prefijo está el router (p. ej. /reports): al llegar al manejador de errores,
 * Express ya lo ha olvidado, y sin él Sentry agruparía mal las rutas. Es el patrón, nunca la URL real.
 */
const mountedAt = (path: string): RequestHandler => (_req, res, next) => {
  res.locals.mountPath = path
  next()
}

export const app = express()

app.set('trust proxy', env.TRUST_PROXY)
app.use(helmet())
app.use(cors({ origin: env.CORS_ORIGIN }))
app.use(express.json({ limit: '100kb' }))
app.use(apiLimiter, writeLimiter)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/me/pets', mountedAt('/me/pets'), myPetsRouter)
app.use('/me/reports', mountedAt('/me/reports'), myReportsRouter)
app.use('/me/inbox', mountedAt('/me/inbox'), inboxRouter)
app.use('/me', mountedAt('/me'), meRouter)
app.use('/usernames', mountedAt('/usernames'), usernamesRouter)
app.use('/pets', mountedAt('/pets'), petsRouter)
app.use('/users/:username/pets', mountedAt('/users/:username/pets'), userPetsRouter)
app.use('/users', mountedAt('/users'), usersRouter)
app.use('/reports/:reportId/sightings', mountedAt('/reports/:reportId/sightings'), sightingsRouter)
app.use('/reports', mountedAt('/reports'), reportsRouter)
app.use('/posts', mountedAt('/posts'), postsRouter)
app.use('/feed', mountedAt('/feed'), feedRouter)
app.use('/conversations', mountedAt('/conversations'), conversationsRouter)
app.use('/notifications', mountedAt('/notifications'), notificationsRouter)
app.use('/flags', mountedAt('/flags'), flagsRouter)
app.use('/push', mountedAt('/push'), pushRouter)
app.use('/admin', mountedAt('/admin'), adminRouter)
app.use('/cron', mountedAt('/cron'), cronRouter)
app.use('/share', mountedAt('/share'), shareRouter)
app.use('/geocode', mountedAt('/geocode'), geocodeRouter)

// Cualquier otra ruta: 404 en JSON (en vez del HTML por defecto de Express).
app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' })
})

app.use(errorHandler)
