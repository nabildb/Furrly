import { Router } from 'express'
import { z } from 'zod'
import { parse } from '../lib/http.js'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

const PAGE_SIZE = 20

/** Notificaciones del usuario autenticado, más recientes primero. Se monta en /notifications. */
export const notificationsRouter = Router()

notificationsRouter.get('/', requireAuth, async (req, res) => {
  const { cursor } = parse(z.object({ cursor: z.uuid().optional() }), req.query)
  const rows = await prisma.notification.findMany({
    where: { userId: req.userId },
    select: {
      id: true,
      type: true,
      message: true,
      readAt: true,
      createdAt: true,
      actor: { select: { username: true, displayName: true, avatarUrl: true } },
      report: { select: { id: true, type: true, title: true } },
      post: { select: { id: true, imageUrl: true, pet: { select: { name: true } } } },
      pet: { select: { id: true, name: true } },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: PAGE_SIZE + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
  })
  const hasMore = rows.length > PAGE_SIZE
  const page = rows.slice(0, PAGE_SIZE)
  res.json({ notifications: page, nextCursor: hasMore ? page[page.length - 1].id : null })
})

/** Marca todas como leídas (se llama al abrir la pantalla de notificaciones). */
notificationsRouter.post('/read', requireAuth, async (req, res) => {
  await prisma.notification.updateMany({ where: { userId: req.userId, readAt: null }, data: { readAt: new Date() } })
  res.status(204).end()
})
