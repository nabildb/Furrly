import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { env } from './lib/env.js'
import { errorHandler } from './lib/http.js'
import { apiLimiter, writeLimiter } from './middleware/rateLimit.js'
import { meRouter } from './routes/me.js'
import { myPetsRouter, petsRouter, userPetsRouter } from './routes/pets.js'
import { myReportsRouter, reportsRouter } from './routes/reports.js'
import { sightingsRouter } from './routes/sightings.js'
import { usernamesRouter } from './routes/usernames.js'
import { usersRouter } from './routes/users.js'

export const app = express()

app.set('trust proxy', env.TRUST_PROXY)
app.use(helmet())
app.use(cors({ origin: env.CORS_ORIGIN }))
app.use(express.json({ limit: '100kb' }))
app.use(apiLimiter, writeLimiter)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/me/pets', myPetsRouter)
app.use('/me/reports', myReportsRouter)
app.use('/me', meRouter)
app.use('/usernames', usernamesRouter)
app.use('/pets', petsRouter)
app.use('/users/:username/pets', userPetsRouter)
app.use('/users', usersRouter)
app.use('/reports/:reportId/sightings', sightingsRouter)
app.use('/reports', reportsRouter)

// Cualquier otra ruta: 404 en JSON (en vez del HTML por defecto de Express).
app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' })
})

app.use(errorHandler)
