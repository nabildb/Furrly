import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { env } from './lib/env.js'
import { meRouter } from './routes/me.js'
import { usernamesRouter } from './routes/usernames.js'

export const app = express()

app.use(helmet())
app.use(cors({ origin: env.CORS_ORIGIN }))
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/me', meRouter)
app.use('/usernames', usernamesRouter)
