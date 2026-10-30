import { Router } from 'express'
import { z } from 'zod'
import type { FlagTarget } from '../generated/prisma/enums.js'
import { deleteAccount } from '../lib/accounts.js'
import { HttpError, parse } from '../lib/http.js'
import { prisma } from '../lib/prisma.js'
import { requireAdmin } from '../middleware/auth.js'

/** Lo denunciado, resumido para revisarlo sin salir del panel. null = ya no existe. */
async function preview(targetType: FlagTarget, targetId: string, reporterIds: string[]) {
  const author = { select: { username: true, displayName: true, suspendedAt: true } } as const
  switch (targetType) {
    case 'report': {
      const r = await prisma.report.findUnique({ where: { id: targetId }, select: { title: true, description: true, reporter: author } })
      return r && { title: r.title, text: r.description, url: `/avisos/${targetId}`, author: r.reporter }
    }
    case 'post': {
      const p = await prisma.post.findUnique({
        where: { id: targetId },
        select: { caption: true, imageUrl: true, pet: { select: { name: true, owner: author } } },
      })
      return p && { title: `Publicación de ${p.pet.name}`, text: p.caption, imageUrl: p.imageUrl, url: `/publicaciones/${targetId}`, author: p.pet.owner }
    }
    case 'comment': {
      const c = await prisma.comment.findUnique({ where: { id: targetId }, select: { body: true, postId: true, user: author } })
      return c && { title: 'Comentario', text: c.body, url: `/publicaciones/${c.postId}`, author: c.user }
    }
    case 'user': {
      const u = await prisma.user.findUnique({ where: { id: targetId }, select: { username: true, displayName: true, suspendedAt: true, bio: true } })
      return u && { title: u.displayName, text: u.bio, url: `/u/${u.username}`, author: { username: u.username, displayName: u.displayName, suspendedAt: u.suspendedAt } }
    }
    case 'conversation': {
      // Privada: el moderador solo la ve porque alguien de dentro la ha denunciado.
      const c = await prisma.conversation.findUnique({
        where: { id: targetId },
        select: {
          userA: author,
          userB: author,
          userAId: true,
          messages: { orderBy: { createdAt: 'desc' }, take: 20, select: { body: true, createdAt: true, sender: { select: { username: true } } } },
        },
      })
      if (!c) return null
      // El denunciado es quien no ha denunciado (si denuncian los dos, el primero).
      const reported = reporterIds.includes(c.userAId) ? c.userB : c.userA
      return {
        title: `Conversación entre @${c.userA.username} y @${c.userB.username}`,
        text: null,
        messages: c.messages.reverse().map((m) => ({ from: m.sender.username, body: m.body, createdAt: m.createdAt })),
        author: reported,
      }
    }
  }
}

export const adminRouter = Router()
adminRouter.use(requireAdmin)

/** Denuncias agrupadas por contenido: pendientes (por defecto) o ya resueltas. */
adminRouter.get('/flags', async (req, res) => {
  const { estado } = parse(z.object({ estado: z.enum(['pendientes', 'resueltas']).default('pendientes') }), req.query)
  const flags = await prisma.contentFlag.findMany({
    where: { resolvedAt: estado === 'pendientes' ? null : { not: null } },
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: { targetType: true, targetId: true, reason: true, details: true, createdAt: true, resolvedAt: true, reporterId: true, reporter: { select: { username: true } } },
  })

  const groups = new Map<string, typeof flags>()
  for (const f of flags) {
    const key = `${f.targetType}:${f.targetId}`
    groups.set(key, [...(groups.get(key) ?? []), f])
  }

  const items = await Promise.all(
    [...groups.values()].slice(0, 50).map(async (group) => {
      const { targetType, targetId } = group[0]
      return {
        targetType,
        targetId,
        count: group.length,
        lastFlaggedAt: group[0].createdAt,
        resolvedAt: group[0].resolvedAt,
        flags: group.map((f) => ({ reason: f.reason, details: f.details, by: f.reporter.username, createdAt: f.createdAt })),
        target: await preview(targetType, targetId, group.map((f) => f.reporterId)),
      }
    }),
  )
  res.json(items)
})

/** Nº de contenidos con denuncias pendientes (para el globo del menú). */
adminRouter.get('/flags/count', async (_req, res) => {
  const pending = await prisma.contentFlag.groupBy({ by: ['targetType', 'targetId'], where: { resolvedAt: null } })
  res.json({ pending: pending.length })
})

const resolveSchema = z.object({
  targetType: z.enum(['report', 'post', 'comment', 'user', 'conversation']),
  targetId: z.uuid(),
  // dismiss: no pasa nada · remove: se borra el contenido · suspend: se suspende al autor
  action: z.enum(['dismiss', 'remove', 'suspend']),
})

/** Id del autor de lo denunciado (para suspenderlo). */
async function authorOf(targetType: FlagTarget, targetId: string) {
  const reporterIds = (await prisma.contentFlag.findMany({ where: { targetType, targetId }, select: { reporterId: true } })).map((f) => f.reporterId)
  switch (targetType) {
    case 'report':
      return (await prisma.report.findUnique({ where: { id: targetId }, select: { reporterId: true } }))?.reporterId
    case 'post':
      return (await prisma.post.findUnique({ where: { id: targetId }, select: { pet: { select: { ownerId: true } } } }))?.pet.ownerId
    case 'comment':
      return (await prisma.comment.findUnique({ where: { id: targetId }, select: { userId: true } }))?.userId
    case 'user':
      return targetId
    case 'conversation': {
      const c = await prisma.conversation.findUnique({ where: { id: targetId }, select: { userAId: true, userBId: true } })
      return c && (reporterIds.includes(c.userAId) ? c.userBId : c.userAId)
    }
  }
}

/** Un moderador no suspende ni borra su propia cuenta desde aquí, ni la de otro moderador. */
async function assertRegularUser(userId: string, moderatorId: string) {
  if (userId === moderatorId) throw new HttpError(400, 'Eso no se puede hacer con tu propia cuenta')
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } })
  if (user?.isAdmin) throw new HttpError(400, 'Eso no se puede hacer con la cuenta de un moderador')
}

/** Suspende la cuenta: no puede usar la API (requireAuth) ni volver a entrar en Supabase Auth. */
async function suspend(userId: string, moderatorId: string) {
  await assertRegularUser(userId, moderatorId)
  await prisma.user.update({ where: { id: userId }, data: { suspendedAt: new Date() } })
  const [{ hasAuth }] = await prisma.$queryRaw<{ hasAuth: boolean }[]>`SELECT to_regclass('auth.users') IS NOT NULL AS "hasAuth"`
  if (hasAuth) {
    await prisma.$executeRaw`UPDATE auth.users SET banned_until = 'infinity' WHERE id = ${userId}::uuid`
    await prisma.$executeRaw`DELETE FROM auth.sessions WHERE user_id = ${userId}::uuid`
  }
}

const resolveFlags = (targetType: FlagTarget, targetId: string) =>
  prisma.contentFlag.updateMany({ where: { targetType, targetId, resolvedAt: null }, data: { resolvedAt: new Date() } })

/** Lo borrado arrastra publicaciones, comentarios, avisos...: las denuncias de lo que ya no existe no tienen nada que revisar. */
const resolveOrphanFlags = () => prisma.$executeRaw`
  UPDATE content_flags f SET resolved_at = now()
  WHERE f.resolved_at IS NULL AND CASE f.target_type
    WHEN 'report' THEN NOT EXISTS (SELECT 1 FROM reports WHERE id = f.target_id)
    WHEN 'post' THEN NOT EXISTS (SELECT 1 FROM posts WHERE id = f.target_id)
    WHEN 'comment' THEN NOT EXISTS (SELECT 1 FROM comments WHERE id = f.target_id)
    WHEN 'user' THEN NOT EXISTS (SELECT 1 FROM users WHERE id = f.target_id)
    WHEN 'conversation' THEN NOT EXISTS (SELECT 1 FROM conversations WHERE id = f.target_id)
  END`

const contentSchema = z.object({ type: z.enum(['report', 'post', 'comment', 'sighting', 'pet']), id: z.uuid() })

/** Borra un contenido; false si ya no existía. Sus fotos, si las tiene, se van con la limpieza nocturna. */
async function removeContent(type: z.infer<typeof contentSchema>['type'], id: string) {
  const where = { id }
  switch (type) {
    case 'pet':
      return (await prisma.pet.deleteMany({ where })).count > 0
    case 'report':
      return (await prisma.report.deleteMany({ where })).count > 0
    case 'post':
      return (await prisma.post.deleteMany({ where })).count > 0
    case 'comment':
      return (await prisma.comment.deleteMany({ where })).count > 0
    case 'sighting':
      return (await prisma.sighting.deleteMany({ where })).count > 0
  }
}

adminRouter.post('/flags/resolve', async (req, res) => {
  const { targetType, targetId, action } = parse(resolveSchema, req.body)
  const pending = await prisma.contentFlag.count({ where: { targetType, targetId, resolvedAt: null } })
  if (pending === 0) throw new HttpError(404, 'No hay denuncias pendientes de ese contenido')

  if (action === 'remove') {
    if (targetType === 'user' || targetType === 'conversation') {
      throw new HttpError(400, 'Los usuarios y las conversaciones no se borran: suspende al autor')
    }
    await removeContent(targetType, targetId)
    await resolveOrphanFlags()
  }
  if (action === 'suspend') {
    const authorId = await authorOf(targetType, targetId)
    if (!authorId) throw new HttpError(404, 'El autor ya no existe')
    await suspend(authorId, req.userId!)
  }

  await resolveFlags(targetType, targetId)
  res.json({ ok: true })
})

/** Moderación directa: borrar cualquier contenido sin esperar a una denuncia. Las que tuviera quedan resueltas. */
adminRouter.delete('/content/:type/:id', async (req, res) => {
  const { type, id } = parse(contentSchema, req.params)
  if (!(await removeContent(type, id))) throw new HttpError(404, 'Ese contenido ya no existe')
  await resolveOrphanFlags()
  res.status(204).end()
})

/** Cuentas suspendidas, para poder levantar la suspensión. */
adminRouter.get('/suspended', async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { suspendedAt: { not: null } },
    orderBy: { suspendedAt: 'desc' },
    select: { username: true, displayName: true, suspendedAt: true },
  })
  res.json(users)
})

async function findUserId(username: string) {
  const user = await prisma.user.findUnique({ where: { username: username.toLowerCase() }, select: { id: true } })
  if (!user) throw new HttpError(404, 'Usuario no encontrado')
  return user.id
}

/** Borrar una cuenta y todo lo suyo. A diferencia de suspender, su email queda libre para volver a registrarse. */
adminRouter.delete('/users/:username', async (req, res) => {
  const userId = await findUserId(String(req.params.username))
  await assertRegularUser(userId, req.userId!)
  await deleteAccount(userId)
  await resolveOrphanFlags()
  res.status(204).end()
})

/** Suspender desde su perfil, sin esperar a una denuncia. Las que tuviera ese perfil quedan resueltas. */
adminRouter.put('/suspended/:username', async (req, res) => {
  const userId = await findUserId(String(req.params.username))
  await suspend(userId, req.userId!)
  await resolveFlags('user', userId)
  res.status(204).end()
})

adminRouter.delete('/suspended/:username', async (req, res) => {
  const userId = await findUserId(String(req.params.username))
  await prisma.user.update({ where: { id: userId }, data: { suspendedAt: null } })
  const [{ hasAuth }] = await prisma.$queryRaw<{ hasAuth: boolean }[]>`SELECT to_regclass('auth.users') IS NOT NULL AS "hasAuth"`
  if (hasAuth) await prisma.$executeRaw`UPDATE auth.users SET banned_until = NULL WHERE id = ${userId}::uuid`
  res.status(204).end()
})

/** Error de prueba: para comprobar desde el panel que los 500 llegan a Sentry. */
adminRouter.post('/sentry-test', () => {
  throw new Error('Prueba de Sentry desde la API de Furrly')
})
