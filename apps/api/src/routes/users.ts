import { Router } from 'express'
import { HttpError } from '../lib/http.js'
import { prisma } from '../lib/prisma.js'

/** Perfil público: nunca incluye la zona de alertas (es la ubicación aproximada de su casa). */
export const usersRouter = Router()

usersRouter.get('/:username', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { username: req.params.username.toLowerCase() },
    select: {
      username: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      createdAt: true,
      _count: { select: { pets: true, reports: true } },
    },
  })
  if (!user) throw new HttpError(404, 'Usuario no encontrado')

  const { _count, ...profile } = user
  res.json({ ...profile, petsCount: _count.pets, reportsCount: _count.reports })
})
