import { Router } from 'express'
import { HttpError } from '../lib/http.js'
import { prisma } from '../lib/prisma.js'
import { optionalAuth, requireAuth } from '../middleware/auth.js'

async function findUserId(username: string) {
  const user = await prisma.user.findUnique({ where: { username: username.toLowerCase() }, select: { id: true } })
  if (!user) throw new HttpError(404, 'Usuario no encontrado')
  return user.id
}

/** Perfil público: nunca incluye la zona de alertas (es la ubicación aproximada de su casa). */
export const usersRouter = Router()

usersRouter.get('/:username', optionalAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { username: String(req.params.username).toLowerCase() },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      createdAt: true,
      _count: { select: { pets: true, reports: true } },
    },
  })
  if (!user) throw new HttpError(404, 'Usuario no encontrado')

  const { _count, id, ...profile } = user
  // Solo se dice si lo has bloqueado tú; nunca si él te ha bloqueado a ti.
  const blockedByMe = req.userId
    ? (await prisma.userBlock.count({ where: { blockerId: req.userId, blockedId: id } })) > 0
    : false
  res.json({ ...profile, petsCount: _count.pets, reportsCount: _count.reports, blockedByMe })
})

/** Bloquear: idempotente (bloquear dos veces no falla). */
usersRouter.put('/:username/block', requireAuth, async (req, res) => {
  const blockedId = await findUserId(String(req.params.username))
  if (blockedId === req.userId) throw new HttpError(400, 'No puedes bloquearte a ti mismo')
  await prisma.userBlock.createMany({ data: [{ blockerId: req.userId!, blockedId }], skipDuplicates: true })
  res.json({ blockedByMe: true })
})

usersRouter.delete('/:username/block', requireAuth, async (req, res) => {
  const blockedId = await findUserId(String(req.params.username))
  await prisma.userBlock.deleteMany({ where: { blockerId: req.userId, blockedId } })
  res.json({ blockedByMe: false })
})
