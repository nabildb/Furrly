import { Router } from 'express'
import { z } from 'zod'
import { HttpError, parse } from '../lib/http.js'
import { prisma } from '../lib/prisma.js'
import { isOwnMediaUrl } from '../lib/storage.js'
import { requireAuth } from '../middleware/auth.js'

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((s) => s || null)
    .nullable()
    .optional()

const updateMeSchema = z.object({
  displayName: z.string().trim().min(1).max(60).optional(),
  bio: optionalText(300),
  avatarUrl: z.url().nullable().optional(),
  // null = sin zona de alertas
  alertLocation: z
    .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
    .nullable()
    .optional(),
  alertRadiusKm: z.number().int().min(1).max(50).optional(),
})

async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, usernameConfirmed: true, isAdmin: true, displayName: true, avatarUrl: true, bio: true, alertRadiusKm: true },
  })
  if (!user) throw new HttpError(404, 'Perfil no encontrado')

  const [{ lat, lng }] = await prisma.$queryRaw<{ lat: number | null; lng: number | null }[]>`
    SELECT ST_Y(alert_location::geometry) AS lat, ST_X(alert_location::geometry) AS lng
    FROM users WHERE id = ${userId}::uuid`

  return { ...user, alertLocation: lat === null || lng === null ? null : { lat, lng } }
}

export const meRouter = Router()

meRouter.get('/', requireAuth, async (req, res) => {
  res.json(await getMe(req.userId!))
})

meRouter.patch('/', requireAuth, async (req, res) => {
  const userId = req.userId!
  const { alertLocation, ...fields } = parse(updateMeSchema, req.body)
  if (fields.avatarUrl && !isOwnMediaUrl(fields.avatarUrl, userId)) {
    throw new HttpError(400, 'El avatar debe estar subido a tu carpeta de Furrly')
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: fields })
    // Prisma no escribe geography: la zona de alertas va con SQL parametrizado.
    if (alertLocation === null) {
      await tx.$executeRaw`UPDATE users SET alert_location = NULL WHERE id = ${userId}::uuid`
    } else if (alertLocation) {
      await tx.$executeRaw`
        UPDATE users
        SET alert_location = ST_SetSRID(ST_MakePoint(${alertLocation.lng}, ${alertLocation.lat}), 4326)::geography
        WHERE id = ${userId}::uuid`
    }
  })

  res.json(await getMe(userId))
})

const chooseUsernameSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,30}$/, 'Formato no válido: 3-30 caracteres, minúsculas, números o _'),
  displayName: z.string().trim().min(1).max(60),
})

/**
 * Quien entra con Google/Apple tiene un username provisional: aquí lo confirma o lo cambia.
 * Solo una vez; después el username es fijo (los enlaces /u/:username no se rompen).
 */
meRouter.put('/username', requireAuth, async (req, res) => {
  const userId = req.userId!
  const { username, displayName } = parse(chooseUsernameSchema, req.body)
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { usernameConfirmed: true } })
  if (!me) throw new HttpError(404, 'Perfil no encontrado')
  if (me.usernameConfirmed) throw new HttpError(409, 'Tu nombre de usuario ya está elegido')

  const taken = await prisma.user.findFirst({ where: { username, NOT: { id: userId } }, select: { id: true } })
  if (taken) throw new HttpError(409, 'Ese nombre de usuario ya está cogido')

  await prisma.user.update({ where: { id: userId }, data: { username, displayName, usernameConfirmed: true } })
  res.json(await getMe(userId))
})

/** Usuarios que he bloqueado (para poder desbloquearlos desde el perfil). */
meRouter.get('/blocks', requireAuth, async (req, res) => {
  const blocks = await prisma.userBlock.findMany({
    where: { blockerId: req.userId },
    select: { createdAt: true, blocked: { select: { username: true, displayName: true, avatarUrl: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json(blocks.map((b) => ({ ...b.blocked, blockedAt: b.createdAt })))
})

/**
 * Borrar la cuenta. En Supabase se borra el usuario de auth.users: el trigger on_auth_user_deleted
 * borra el perfil y, en cascada, mascotas, avisos, publicaciones, mensajes... (la API se conecta
 * como postgres, que puede hacerlo). En los tests no existe el schema auth: se borra el perfil.
 * Las fotos de Storage las borra antes la web, que es quien tiene permiso sobre la carpeta.
 */
meRouter.delete('/', requireAuth, async (req, res) => {
  const userId = req.userId!
  const [{ hasAuth }] = await prisma.$queryRaw<{ hasAuth: boolean }[]>`
    SELECT to_regclass('auth.users') IS NOT NULL AS "hasAuth"`
  if (hasAuth) await prisma.$executeRaw`DELETE FROM auth.users WHERE id = ${userId}::uuid`
  await prisma.user.deleteMany({ where: { id: userId } })
  res.status(204).end()
})

