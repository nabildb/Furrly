import { Router } from 'express'
import { z } from 'zod'
import { assertNotBlocked, isBlockedEitherWay } from '../lib/blocks.js'
import { HttpError, parse } from '../lib/http.js'
import { prisma } from '../lib/prisma.js'
import { pushToUsers } from '../lib/push.js'
import { requireAuth } from '../middleware/auth.js'

const PAGE_SIZE = 50

/** Límites contra el spam, por usuario (el rate limiting general es por IP). */
export const MESSAGES_PER_HOUR = 30
export const NEW_CONVERSATIONS_PER_DAY = 10

const messageSchema = z.object({
  body: z.string().trim().min(1).max(1000),
  reportId: z.uuid().nullable().optional(),
})

const startSchema = messageSchema.extend({ username: z.string().trim().toLowerCase() })

/** La pareja se guarda ordenada (CHECK user_a_id < user_b_id): así solo hay una conversación por pareja. */
const orderedPair = (a: string, b: string) => (a < b ? [a, b] : [b, a]) as [string, string]

const messageSelect = {
  id: true,
  body: true,
  senderId: true,
  createdAt: true,
  report: { select: { id: true, type: true, title: true } },
} as const

/** La conversación si quien pide participa en ella; si no, 404 (no se revela que existe). */
async function findOwnConversation(id: string, userId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { id, OR: [{ userAId: userId }, { userBId: userId }] },
    select: {
      id: true,
      userAId: true,
      userA: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      userB: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  })
  if (!conversation) throw new HttpError(404, 'Conversación no encontrada')
  const iAmA = conversation.userAId === userId
  return { id: conversation.id, iAmA, other: iAmA ? conversation.userB : conversation.userA }
}

/** Corta el envío si el usuario ha mandado demasiados mensajes en la última hora. */
async function assertMessageQuota(senderId: string) {
  const sent = await prisma.message.count({
    where: { senderId, createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } },
  })
  if (sent >= MESSAGES_PER_HOUR) throw new HttpError(429, 'Has enviado muchos mensajes seguidos. Espera un rato.')
}

/** Corta la creación de conversaciones nuevas si ha empezado demasiadas en las últimas 24 h. */
async function assertNewConversationQuota(userId: string) {
  // Conversaciones de las últimas 24 h cuyo primer mensaje es suyo (= las ha empezado él).
  const [{ started }] = await prisma.$queryRaw<{ started: number }[]>`
    SELECT count(*)::int AS started
    FROM conversations c
    WHERE c.created_at > now() - interval '24 hours'
      AND ${userId}::uuid IN (c.user_a_id, c.user_b_id)
      AND (SELECT m.sender_id FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at LIMIT 1) = ${userId}::uuid`
  if (started >= NEW_CONVERSATIONS_PER_DAY) {
    throw new HttpError(429, 'Has empezado muchas conversaciones hoy. Vuelve a intentarlo mañana.')
  }
}

/** Push al otro participante. Misma etiqueta por conversación: el móvil enseña solo el último. */
async function pushMessage(conversationId: string, senderId: string, body: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { userAId: true, userBId: true },
  })
  const sender = await prisma.user.findUnique({ where: { id: senderId }, select: { username: true } })
  if (!conversation || !sender) return
  const recipient = conversation.userAId === senderId ? conversation.userBId : conversation.userAId
  await pushToUsers([recipient], {
    title: `Mensaje de @${sender.username}`,
    body: body.length > 120 ? `${body.slice(0, 117)}…` : body,
    url: `/mensajes/${conversationId}`,
    tag: `conversation-${conversationId}`,
  })
}

async function addMessage(conversationId: string, senderId: string, body: string, reportId?: string | null) {
  if (reportId && !(await prisma.report.findUnique({ where: { id: reportId }, select: { id: true } }))) {
    throw new HttpError(404, 'Aviso no encontrado')
  }
  const [message] = await prisma.$transaction([
    prisma.message.create({ data: { conversationId, senderId, body, reportId }, select: messageSelect }),
    prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } }),
  ])
  await pushMessage(conversationId, senderId, body)
  return message
}

interface ConversationRow {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  last_body: string | null
  last_from_me: boolean | null
  last_at: Date | null
  unread: number
}

/** Conversaciones privadas entre usuarios. Se monta en /conversations. */
export const conversationsRouter = Router()

/**
 * Mis conversaciones con el último mensaje y cuántos no he leído, en una sola consulta:
 * LATERAL trae el último mensaje de cada una y la subconsulta cuenta los posteriores a mi lectura.
 */
conversationsRouter.get('/', requireAuth, async (req, res) => {
  const me = req.userId!
  const rows = await prisma.$queryRaw<ConversationRow[]>`
    SELECT c.id, o.username, o.display_name, o.avatar_url,
           lm.body AS last_body, lm.sender_id = ${me}::uuid AS last_from_me, lm.created_at AS last_at,
           (SELECT count(*)::int FROM messages m
             WHERE m.conversation_id = c.id AND m.sender_id <> ${me}::uuid
               AND m.created_at > coalesce(CASE WHEN c.user_a_id = ${me}::uuid THEN c.user_a_read_at ELSE c.user_b_read_at END,
                                           '-infinity'::timestamptz)) AS unread
    FROM conversations c
    JOIN users o ON o.id = CASE WHEN c.user_a_id = ${me}::uuid THEN c.user_b_id ELSE c.user_a_id END
    LEFT JOIN LATERAL (
      SELECT body, sender_id, created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1
    ) lm ON true
    WHERE ${me}::uuid IN (c.user_a_id, c.user_b_id)
    ORDER BY c.last_message_at DESC
    LIMIT 100`
  res.json(
    rows.map((r) => ({
      id: r.id,
      other: { username: r.username, displayName: r.display_name, avatarUrl: r.avatar_url },
      lastMessage: r.last_at ? { body: r.last_body, fromMe: r.last_from_me, createdAt: r.last_at } : null,
      unread: r.unread,
    })),
  )
})

/** Escribir a alguien: reutiliza la conversación si ya existe y añade el mensaje. */
conversationsRouter.post('/', requireAuth, async (req, res) => {
  const me = req.userId!
  const { username, body, reportId } = parse(startSchema, req.body)
  const other = await prisma.user.findUnique({ where: { username }, select: { id: true } })
  if (!other) throw new HttpError(404, 'Usuario no encontrado')
  if (other.id === me) throw new HttpError(400, 'No puedes escribirte a ti mismo')
  await assertNotBlocked(me, other.id)

  const [userAId, userBId] = orderedPair(me, other.id)
  const existing = await prisma.conversation.findUnique({ where: { userAId_userBId: { userAId, userBId } }, select: { id: true } })
  if (!existing) await assertNewConversationQuota(me)
  await assertMessageQuota(me)
  const conversation = await prisma.conversation.upsert({
    where: { userAId_userBId: { userAId, userBId } },
    create: { userAId, userBId },
    update: {},
    select: { id: true },
  })
  const message = await addMessage(conversation.id, me, body, reportId)
  res.status(201).json({ conversationId: conversation.id, message })
})

/** Mensajes de una conversación (los más recientes; ?before=<id> para los anteriores). Marca como leída. */
conversationsRouter.get('/:id', requireAuth, async (req, res) => {
  const me = req.userId!
  const conversation = await findOwnConversation(parse(z.uuid(), req.params.id), me)
  const { before } = parse(z.object({ before: z.uuid().optional() }), req.query)

  const rows = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    select: messageSelect,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: PAGE_SIZE + 1,
    ...(before && { cursor: { id: before }, skip: 1 }),
  })
  const hasMore = rows.length > PAGE_SIZE
  // En pantalla van de más antiguo a más reciente; el cursor para cargar más es el más antiguo.
  const messages = rows.slice(0, PAGE_SIZE).reverse()

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: conversation.iAmA ? { userAReadAt: new Date() } : { userBReadAt: new Date() },
  })

  const blockedByMe = (await prisma.userBlock.count({ where: { blockerId: me, blockedId: conversation.other.id } })) > 0
  res.json({
    id: conversation.id,
    // Si hay un bloqueo (en cualquier sentido) no se puede responder; solo se dice si lo has bloqueado tú.
    canReply: !(await isBlockedEitherWay(me, conversation.other.id)),
    blockedByMe,
    other: { username: conversation.other.username, displayName: conversation.other.displayName, avatarUrl: conversation.other.avatarUrl },
    messages: messages.map(({ senderId, ...m }) => ({ ...m, fromMe: senderId === me })),
    olderCursor: hasMore ? messages[0].id : null,
  })
})

conversationsRouter.post('/:id/messages', requireAuth, async (req, res) => {
  const me = req.userId!
  const conversation = await findOwnConversation(parse(z.uuid(), req.params.id), me)
  const { body, reportId } = parse(messageSchema, req.body)
  await assertNotBlocked(me, conversation.other.id)
  await assertMessageQuota(me)
  const { senderId, ...message } = await addMessage(conversation.id, me, body, reportId)
  res.status(201).json({ ...message, fromMe: senderId === me })
})

/** Contadores para los globos de la navegación. Se monta en /me/inbox. */
export const inboxRouter = Router()

inboxRouter.get('/', requireAuth, async (req, res) => {
  const me = req.userId!
  const [notifications, [{ messages }]] = await Promise.all([
    prisma.notification.count({ where: { userId: me, readAt: null } }),
    prisma.$queryRaw<{ messages: number }[]>`
      SELECT count(*)::int AS messages
      FROM messages m JOIN conversations c ON c.id = m.conversation_id
      WHERE ${me}::uuid IN (c.user_a_id, c.user_b_id) AND m.sender_id <> ${me}::uuid
        AND m.created_at > coalesce(CASE WHEN c.user_a_id = ${me}::uuid THEN c.user_a_read_at ELSE c.user_b_read_at END,
                                    '-infinity'::timestamptz)`,
  ])
  res.json({ notifications, messages })
})
