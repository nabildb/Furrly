import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

export const meRouter = Router()

meRouter.get('/', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, username: true, displayName: true, avatarUrl: true, bio: true, alertRadiusKm: true },
  })
  if (!user) {
    res.status(404).json({ error: 'Perfil no encontrado' })
    return
  }
  res.json(user)
})
