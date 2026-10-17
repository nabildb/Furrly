import { HttpError } from './http.js'
import { prisma } from './prisma.js'

/** ¿Hay un bloqueo entre estos dos usuarios, en cualquier sentido? */
export async function isBlockedEitherWay(a: string, b: string) {
  const count = await prisma.userBlock.count({
    where: { OR: [{ blockerId: a, blockedId: b }, { blockerId: b, blockedId: a }] },
  })
  return count > 0
}

/**
 * Corta cualquier interacción (mensajes, comentarios, likes, seguir) si hay un bloqueo de por medio.
 * El mensaje es el mismo en los dos sentidos: no revelamos quién ha bloqueado a quién.
 */
export async function assertNotBlocked(a: string, b: string) {
  if (await isBlockedEitherWay(a, b)) throw new HttpError(403, 'No puedes interactuar con este usuario')
}
