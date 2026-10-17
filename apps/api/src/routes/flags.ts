import { Router } from 'express'
import { z } from 'zod'
import { FlagReason } from '../generated/prisma/enums.js'
import { HttpError, parse } from '../lib/http.js'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

const flagSchema = z.discriminatedUnion('targetType', [
  z.object({ targetType: z.enum(['report', 'post', 'comment', 'conversation']), targetId: z.uuid() }),
  // A los usuarios se les conoce por su username en la web.
  z.object({ targetType: z.literal('user'), username: z.string().trim().toLowerCase() }),
]).and(
  z.object({
    reason: z.enum(FlagReason),
    details: z.string().trim().max(500).transform((s) => s || null).nullable().optional(),
  }),
)

/** Comprueba que lo denunciado existe y devuelve su id. */
async function resolveTarget(target: z.infer<typeof flagSchema>, userId: string) {
  const select = { id: true } as const
  const found =
    target.targetType === 'conversation'
      ? // Una conversación solo la puede denunciar quien participa en ella (es privada).
        await prisma.conversation.findFirst({ where: { id: target.targetId, OR: [{ userAId: userId }, { userBId: userId }] }, select })
      : target.targetType === 'user'
      ? await prisma.user.findUnique({ where: { username: target.username }, select })
      : target.targetType === 'report'
        ? await prisma.report.findUnique({ where: { id: target.targetId }, select })
        : target.targetType === 'post'
          ? await prisma.post.findUnique({ where: { id: target.targetId }, select })
          : await prisma.comment.findUnique({ where: { id: target.targetId }, select })
  if (!found) throw new HttpError(404, 'No encontrado')
  return found.id
}

/** Denuncias de contenido. De momento se revisan a mano desde el panel de Supabase. Se monta en /flags. */
export const flagsRouter = Router()

flagsRouter.post('/', requireAuth, async (req, res) => {
  const data = parse(flagSchema, req.body)
  const targetId = await resolveTarget(data, req.userId!)
  if (data.targetType === 'user' && targetId === req.userId) throw new HttpError(400, 'No puedes denunciarte a ti mismo')

  // Una denuncia por persona y contenido: repetirla no duplica nada (y no da pistas de si ya existía).
  await prisma.contentFlag.createMany({
    data: [{ reporterId: req.userId!, targetType: data.targetType, targetId, reason: data.reason, details: data.details }],
    skipDuplicates: true,
  })
  res.status(201).json({ ok: true })
})
