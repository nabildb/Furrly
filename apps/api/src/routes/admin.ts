import { randomBytes } from 'node:crypto'
import { Router } from 'express'
import { z } from 'zod'
import { ModerationAction, type FlagTarget } from '../generated/prisma/enums.js'
import { deleteAccount } from '../lib/accounts.js'
import { HttpError, parse } from '../lib/http.js'
import { decisionSchema, reasonTexts, recordAction, type Decision } from '../lib/moderation.js'
import { notifyModeration } from '../lib/notifications.js'
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

const LOG_PAGE_SIZE = 30
const DAY_MS = 24 * 60 * 60 * 1000

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

const contentSchema = z.object({ type: z.enum(['report', 'post', 'comment', 'sighting', 'pet']), id: z.uuid() })
type ContentType = z.infer<typeof contentSchema>['type']

/** Qué es y de quién: label va al registro, notice es cómo se le nombra a su autor. null = ya no existe. */
async function describeTarget(type: FlagTarget | ContentType, id: string) {
  switch (type) {
    case 'report': {
      const r = await prisma.report.findUnique({ where: { id }, select: { title: true, reporterId: true } })
      return r && { label: `Aviso «${r.title}»`, notice: `tu aviso «${r.title}»`, userId: r.reporterId }
    }
    case 'post': {
      const p = await prisma.post.findUnique({ where: { id }, select: { pet: { select: { name: true, ownerId: true } } } })
      return p && { label: `Publicación de ${p.pet.name}`, notice: `tu publicación de ${p.pet.name}`, userId: p.pet.ownerId }
    }
    case 'comment': {
      const c = await prisma.comment.findUnique({ where: { id }, select: { body: true, userId: true } })
      return c && { label: `Comentario «${c.body}»`, notice: 'tu comentario', userId: c.userId }
    }
    case 'sighting': {
      const s = await prisma.sighting.findUnique({ where: { id }, select: { userId: true, report: { select: { title: true } } } })
      return s && { label: `Avistamiento en «${s.report.title}»`, notice: 'tu avistamiento', userId: s.userId }
    }
    case 'pet': {
      const p = await prisma.pet.findUnique({ where: { id }, select: { name: true, ownerId: true } })
      return p && { label: `Mascota ${p.name}`, notice: `a tu mascota ${p.name}`, userId: p.ownerId }
    }
    case 'user': {
      const u = await prisma.user.findUnique({ where: { id }, select: { username: true } })
      return u && { label: `@${u.username}`, notice: 'tu perfil', userId: id }
    }
    case 'conversation': {
      const c = await prisma.conversation.findUnique({
        where: { id },
        select: { userAId: true, userBId: true, userA: { select: { username: true } }, userB: { select: { username: true } } },
      })
      if (!c) return null
      const flags = await prisma.contentFlag.findMany({ where: { targetType: 'conversation', targetId: id }, select: { reporterId: true } })
      // El denunciado es quien no ha denunciado (si denuncian los dos, el primero).
      const userId = flags.some((f) => f.reporterId === c.userAId) ? c.userBId : c.userAId
      return { label: `Conversación entre @${c.userA.username} y @${c.userB.username}`, notice: 'una conversación', userId }
    }
  }
}

/** Un moderador no suspende ni borra su propia cuenta desde aquí, ni la de otro moderador. */
async function assertRegularUser(userId: string, moderatorId: string) {
  if (userId === moderatorId) throw new HttpError(400, 'Eso no se puede hacer con tu propia cuenta')
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } })
  if (user?.isAdmin) throw new HttpError(400, 'Eso no se puede hacer con la cuenta de un moderador')
}

const suspensionSchema = decisionSchema.extend({ days: z.number().int().min(1).max(365).nullable().optional() })

/** Suspende la cuenta: no puede usar la API (requireAuth) ni entrar en Supabase Auth. Sin días, es indefinida. */
async function suspend(userId: string, moderatorId: string, { days, ...decision }: z.infer<typeof suspensionSchema>) {
  await assertRegularUser(userId, moderatorId)
  const until = days ? new Date(Date.now() + days * DAY_MS) : null
  const { username } = await prisma.user.update({
    where: { id: userId },
    data: { suspendedAt: new Date(), suspendedUntil: until },
    select: { username: true },
  })
  const [{ hasAuth }] = await prisma.$queryRaw<{ hasAuth: boolean }[]>`SELECT to_regclass('auth.users') IS NOT NULL AS "hasAuth"`
  if (hasAuth) {
    await prisma.$executeRaw`UPDATE auth.users SET banned_until = ${until?.toISOString() ?? 'infinity'}::timestamptz WHERE id = ${userId}::uuid`
    await prisma.$executeRaw`DELETE FROM auth.sessions WHERE user_id = ${userId}::uuid`
  }
  const duration = days ? ` durante ${days === 1 ? '1 día' : `${days} días`}` : ''
  await recordAction({ moderatorId, action: 'suspend', targetType: 'user', targetId: userId, targetLabel: `@${username}${duration}`, targetUserId: userId, ...decision })
  await notifyModeration(userId, `Hemos suspendido tu cuenta${duration} por ${reasonTexts[decision.reason]}.`)
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

/**
 * Borra un contenido, cierra las denuncias que quedan sin objeto, lo apunta en el registro y le explica
 * el motivo a su autor. Las fotos, si las tiene, se van con la limpieza nocturna.
 */
async function removeContent(type: ContentType, id: string, moderatorId: string, decision: Decision) {
  const target = await describeTarget(type, id)
  if (!target) return false
  const where = { id }
  if (type === 'pet') await prisma.pet.deleteMany({ where })
  else if (type === 'report') await prisma.report.deleteMany({ where })
  else if (type === 'post') await prisma.post.deleteMany({ where })
  else if (type === 'comment') await prisma.comment.deleteMany({ where })
  else await prisma.sighting.deleteMany({ where })

  await resolveOrphanFlags()
  await recordAction({ moderatorId, action: 'remove', targetType: type, targetId: id, targetLabel: target.label, targetUserId: target.userId, ...decision })
  if (target.userId !== moderatorId) await notifyModeration(target.userId, `Hemos retirado ${target.notice} por ${reasonTexts[decision.reason]}.`)
  return true
}

adminRouter.post('/flags/resolve', async (req, res) => {
  const { targetType, targetId, action } = parse(resolveSchema, req.body)
  const moderatorId = req.userId!
  // Desde el panel, el motivo es el de la denuncia.
  const flag = await prisma.contentFlag.findFirst({ where: { targetType, targetId, resolvedAt: null }, select: { reason: true } })
  if (!flag) throw new HttpError(404, 'No hay denuncias pendientes de ese contenido')
  const decision = { reason: flag.reason }
  const target = await describeTarget(targetType, targetId)

  if (action === 'remove') {
    if (targetType === 'user' || targetType === 'conversation') {
      throw new HttpError(400, 'Los usuarios y las conversaciones no se borran: suspende al autor')
    }
    await removeContent(targetType, targetId, moderatorId, decision)
  }
  if (action === 'suspend') {
    if (!target) throw new HttpError(404, 'El autor ya no existe')
    await suspend(target.userId, moderatorId, decision)
  }
  if (action === 'dismiss') {
    const targetLabel = target?.label ?? 'Contenido que ya no existe'
    await recordAction({ moderatorId, action, targetType, targetId, targetLabel, targetUserId: target?.userId, ...decision })
  }

  await resolveFlags(targetType, targetId)
  res.json({ ok: true })
})

/** Moderación directa: borrar cualquier contenido sin esperar a una denuncia. */
adminRouter.delete('/content/:type/:id', async (req, res) => {
  const { type, id } = parse(contentSchema, req.params)
  const decision = parse(decisionSchema, req.body)
  if (!(await removeContent(type, id, req.userId!, decision))) throw new HttpError(404, 'Ese contenido ya no existe')
  res.status(204).end()
})

const logSelect = {
  id: true,
  action: true,
  targetType: true,
  targetLabel: true,
  reason: true,
  note: true,
  createdAt: true,
  moderator: { select: { username: true } },
  targetUser: { select: { username: true } },
} as const

/** Historial de decisiones, lo más reciente primero. */
adminRouter.get('/log', async (req, res) => {
  const { cursor, action } = parse(z.object({ cursor: z.uuid().optional(), action: z.enum(ModerationAction).optional() }), req.query)
  const rows = await prisma.moderationLog.findMany({
    where: { action },
    select: logSelect,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: LOG_PAGE_SIZE + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
  })
  const hasMore = rows.length > LOG_PAGE_SIZE
  const entries = rows.slice(0, LOG_PAGE_SIZE)
  res.json({ entries, nextCursor: hasMore ? entries[entries.length - 1].id : null })
})

/** Las temporales ya cumplidas no cuentan, aunque esa persona aún no haya vuelto (ver requireAuth). */
const activeSuspension = () => ({ suspendedAt: { not: null }, OR: [{ suspendedUntil: null }, { suspendedUntil: { gt: new Date() } }] })

/** Cuentas suspendidas, para poder levantar la suspensión. */
adminRouter.get('/suspended', async (_req, res) => {
  const users = await prisma.user.findMany({
    where: activeSuspension(),
    orderBy: { suspendedAt: 'desc' },
    select: { username: true, displayName: true, suspendedAt: true, suspendedUntil: true },
  })
  res.json(users)
})

async function findUser(username: string) {
  const user = await prisma.user.findUnique({ where: { username: username.toLowerCase() }, select: { id: true, username: true } })
  if (!user) throw new HttpError(404, 'Usuario no encontrado')
  return user
}

/** Ficha de una cuenta: quién es, qué ha publicado, qué se ha denunciado y qué se ha decidido sobre ella. */
adminRouter.get('/users/:username', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { username: String(req.params.username).toLowerCase() },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      createdAt: true,
      isAdmin: true,
      suspendedAt: true,
      suspendedUntil: true,
      _count: { select: { pets: true, reports: true, comments: true, sightings: true } },
    },
  })
  if (!user) throw new HttpError(404, 'Usuario no encontrado')

  const { id, _count, ...profile } = user
  const [posts, warnings, [{ flags }], history] = await Promise.all([
    prisma.post.count({ where: { pet: { ownerId: id } } }),
    prisma.moderationLog.count({ where: { targetUserId: id, action: 'warn' } }),
    prisma.$queryRaw<{ flags: number }[]>`
      SELECT count(*)::int AS flags FROM content_flags f
      WHERE (f.target_type = 'user' AND f.target_id = ${id}::uuid)
        OR (f.target_type = 'post' AND f.target_id IN (SELECT po.id FROM posts po JOIN pets pe ON pe.id = po.pet_id WHERE pe.owner_id = ${id}::uuid))
        OR (f.target_type = 'report' AND f.target_id IN (SELECT r.id FROM reports r WHERE r.reporter_id = ${id}::uuid))
        OR (f.target_type = 'comment' AND f.target_id IN (SELECT c.id FROM comments c WHERE c.user_id = ${id}::uuid))`,
    prisma.moderationLog.findMany({ where: { targetUserId: id }, select: logSelect, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: LOG_PAGE_SIZE }),
  ])
  res.json({ ...profile, counts: { ..._count, posts }, flags, warnings, history })
})

const cleanSchema = decisionSchema.extend({ fields: z.array(z.enum(['avatar', 'bio', 'displayName', 'username'])).min(1, 'Elige qué quieres limpiar') })

const cleanTexts = { avatar: 'tu foto de perfil', bio: 'tu biografía', displayName: 'tu nombre', username: 'tu nombre de usuario' }

/** Limpiar un perfil: quita lo ofensivo sin tocar la cuenta ni lo publicado. El nombre de usuario se vuelve a elegir al entrar. */
adminRouter.post('/users/:username/clean', async (req, res) => {
  const { fields, ...decision } = parse(cleanSchema, req.body)
  const moderatorId = req.userId!
  const user = await findUser(String(req.params.username))
  await assertRegularUser(user.id, moderatorId)

  const username = fields.includes('username') ? `usuario_${randomBytes(6).toString('hex')}` : user.username
  await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(fields.includes('avatar') && { avatarUrl: null }),
      ...(fields.includes('bio') && { bio: null }),
      ...(fields.includes('displayName') && { displayName: username }),
      ...(fields.includes('username') && { username, usernameConfirmed: false }),
    },
  })

  const what = new Intl.ListFormat('es', { type: 'conjunction' }).format(fields.map((field) => cleanTexts[field]))
  await recordAction({ moderatorId, action: 'clean_profile', targetType: 'user', targetId: user.id, targetLabel: `@${user.username}`, targetUserId: user.id, ...decision })
  await notifyModeration(user.id, `Hemos retirado ${what} por ${reasonTexts[decision.reason]}.`)
  res.json({ username })
})

/** Vaciar una cuenta: borra todo lo que ha publicado, pero la cuenta sigue. Si además se suspende, no podrá volver con ese email. */
adminRouter.post('/users/:username/purge', async (req, res) => {
  const decision = parse(decisionSchema, req.body)
  const moderatorId = req.userId!
  const user = await findUser(String(req.params.username))
  await assertRegularUser(user.id, moderatorId)

  await prisma.$transaction([
    prisma.pet.deleteMany({ where: { ownerId: user.id } }),
    prisma.report.deleteMany({ where: { reporterId: user.id } }),
    prisma.comment.deleteMany({ where: { userId: user.id } }),
    prisma.sighting.deleteMany({ where: { userId: user.id } }),
  ])
  await resolveOrphanFlags()
  await recordAction({ moderatorId, action: 'purge_content', targetType: 'user', targetId: user.id, targetLabel: `@${user.username}`, targetUserId: user.id, ...decision })
  await notifyModeration(user.id, `Hemos retirado todo lo que habías publicado por ${reasonTexts[decision.reason]}.`)
  res.status(204).end()
})

/** Las cifras de arriba del panel. */
adminRouter.get('/stats', async (_req, res) => {
  const lastWeek = { gte: new Date(Date.now() - 7 * DAY_MS) }
  const [pending, resolved, suspended, decisions] = await Promise.all([
    prisma.contentFlag.groupBy({ by: ['targetType', 'targetId'], where: { resolvedAt: null } }),
    prisma.contentFlag.groupBy({ by: ['targetType', 'targetId'], where: { resolvedAt: lastWeek } }),
    prisma.user.count({ where: activeSuspension() }),
    prisma.moderationLog.count({ where: { createdAt: lastWeek } }),
  ])
  res.json({ pending: pending.length, resolvedLastWeek: resolved.length, suspended, decisionsLastWeek: decisions })
})

/** Borrar una cuenta y todo lo suyo. A diferencia de suspender, su email queda libre para volver a registrarse. */
adminRouter.delete('/users/:username', async (req, res) => {
  const decision = parse(decisionSchema, req.body)
  const moderatorId = req.userId!
  const user = await findUser(String(req.params.username))
  await assertRegularUser(user.id, moderatorId)
  await deleteAccount(user.id)
  await resolveOrphanFlags()
  await recordAction({ moderatorId, action: 'delete_account', targetType: 'user', targetId: user.id, targetLabel: `@${user.username}`, ...decision })
  res.status(204).end()
})

/** Advertir: un aviso con el motivo, sin más consecuencias. Queda en su historial. */
adminRouter.post('/users/:username/warn', async (req, res) => {
  const decision = parse(decisionSchema, req.body)
  const moderatorId = req.userId!
  const user = await findUser(String(req.params.username))
  await assertRegularUser(user.id, moderatorId)
  await recordAction({ moderatorId, action: 'warn', targetType: 'user', targetId: user.id, targetLabel: `@${user.username}`, targetUserId: user.id, ...decision })
  await notifyModeration(user.id, `Te hemos enviado una advertencia por ${reasonTexts[decision.reason]}. Si se repite, podríamos suspender tu cuenta.`)
  res.status(204).end()
})

/** Suspender desde su perfil, sin esperar a una denuncia. Las que tuviera ese perfil quedan resueltas. */
adminRouter.put('/suspended/:username', async (req, res) => {
  const suspension = parse(suspensionSchema, req.body)
  const user = await findUser(String(req.params.username))
  await suspend(user.id, req.userId!, suspension)
  await resolveFlags('user', user.id)
  res.status(204).end()
})

adminRouter.delete('/suspended/:username', async (req, res) => {
  const user = await findUser(String(req.params.username))
  await prisma.user.update({ where: { id: user.id }, data: { suspendedAt: null, suspendedUntil: null } })
  const [{ hasAuth }] = await prisma.$queryRaw<{ hasAuth: boolean }[]>`SELECT to_regclass('auth.users') IS NOT NULL AS "hasAuth"`
  if (hasAuth) await prisma.$executeRaw`UPDATE auth.users SET banned_until = NULL WHERE id = ${user.id}::uuid`
  await recordAction({ moderatorId: req.userId!, action: 'unsuspend', targetType: 'user', targetId: user.id, targetLabel: `@${user.username}`, targetUserId: user.id })
  res.status(204).end()
})

/** Error de prueba: para comprobar desde el panel que los 500 llegan a Sentry. */
adminRouter.post('/sentry-test', () => {
  throw new Error('Prueba de Sentry desde la API de Furrly')
})
