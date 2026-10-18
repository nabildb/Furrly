import { timingSafeEqual } from 'node:crypto'
import { Router, type NextFunction, type Request, type Response } from 'express'
import { env } from '../lib/env.js'
import { deletePhotos, findOrphanPhotos } from '../lib/storageCleanup.js'

/** Vercel Cron llama con "Authorization: Bearer <CRON_SECRET>". Cualquier otra llamada se rechaza. */
function requireCronSecret(req: Request, res: Response, next: NextFunction) {
  const expected = Buffer.from(`Bearer ${env.CRON_SECRET ?? ''}`)
  const received = Buffer.from(req.headers.authorization ?? '')
  if (!env.CRON_SECRET || expected.length !== received.length || !timingSafeEqual(expected, received)) {
    res.status(401).json({ error: 'No autorizado' })
    return
  }
  next()
}

/** Tareas programadas (ver "crons" en vercel.json). */
export const cronRouter = Router()

cronRouter.get('/storage-cleanup', requireCronSecret, async (_req, res) => {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    res.status(503).json({ error: 'Limpieza no configurada' })
    return
  }
  const orphans = await findOrphanPhotos()
  res.json({ deleted: await deletePhotos(orphans) })
})
