import { env } from './env.js'
import { prisma } from './prisma.js'
import { sendWebPush, type VapidKeys } from './webpush.js'

export interface PushMessage {
  title: string
  body: string
  /** Ruta de la web que se abre al tocar la notificación. */
  url: string
  /** Notificaciones con la misma etiqueta se sustituyen en vez de acumularse (p. ej. una conversación). */
  tag?: string
}

export const vapidKeys: VapidKeys | null =
  env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY
    ? { publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY, subject: env.VAPID_SUBJECT }
    : null

/**
 * Envía un push a todos los dispositivos de esos usuarios. Las suscripciones que el servicio da por
 * caducadas (404/410: el usuario desinstaló o revocó el permiso) se borran. Nunca lanza: un push
 * fallido no debe romper la acción que lo provocó. Devuelve cuántos aceptó el servicio de push.
 */
export async function pushToUsers(userIds: string[], message: PushMessage) {
  if (!vapidKeys || userIds.length === 0) return 0
  const keys = vapidKeys
  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId: { in: userIds } } })
  const results = await Promise.allSettled(subscriptions.map((s) => sendWebPush(s, message, keys)))

  const expired = subscriptions.filter((_, i) => {
    const r = results[i]
    return r.status === 'fulfilled' && (r.value === 404 || r.value === 410)
  })
  if (expired.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: expired.map((s) => s.id) } } })
  }
  return results.filter((r) => r.status === 'fulfilled' && r.value >= 200 && r.value < 300).length
}

/** Texto del push para cada notificación (los likes no mandan push: serían demasiados). */
export async function pushNotifications(notificationIds: string[]) {
  if (!vapidKeys || notificationIds.length === 0) return
  const notifications = await prisma.notification.findMany({
    where: { id: { in: notificationIds }, type: { not: 'new_like' } },
    select: {
      userId: true,
      type: true,
      actor: { select: { username: true } },
      report: { select: { id: true, title: true, type: true } },
      post: { select: { id: true, pet: { select: { name: true } } } },
      pet: { select: { id: true, name: true } },
    },
  })

  // Las del mismo tipo y objeto llevan el mismo texto: se agrupan para no repetir trabajo.
  const groups = new Map<string, { message: PushMessage; userIds: string[] }>()
  for (const n of notifications) {
    const who = n.actor ? `@${n.actor.username}` : 'Alguien'
    let message: PushMessage | null = null
    if (n.type === 'new_report_nearby' && n.report) {
      message = {
        title: n.report.type === 'lost' ? 'Mascota perdida cerca de ti' : 'Animal encontrado cerca de ti',
        body: n.report.title,
        url: `/avisos/${n.report.id}`,
        tag: `report-${n.report.id}`,
      }
    } else if (n.type === 'new_sighting' && n.report) {
      message = { title: '¡Han visto a tu mascota!', body: `${who} ha añadido un avistamiento`, url: `/avisos/${n.report.id}` }
    } else if (n.type === 'report_resolved' && n.report) {
      message = { title: '¡Buenas noticias!', body: `«${n.report.title}» se ha resuelto. Gracias por ayudar`, url: `/avisos/${n.report.id}` }
    } else if (n.type === 'new_comment' && n.post) {
      message = { title: 'Nuevo comentario', body: `${who} ha comentado la foto de ${n.post.pet.name}`, url: `/publicaciones/${n.post.id}` }
    } else if (n.type === 'new_follower' && n.pet) {
      message = { title: 'Nuevo seguidor', body: `${who} sigue a ${n.pet.name}`, url: `/mascotas/${n.pet.id}` }
    }
    if (!message) continue
    const key = JSON.stringify(message)
    const group = groups.get(key) ?? { message, userIds: [] }
    group.userIds.push(n.userId)
    groups.set(key, group)
  }
  await Promise.all([...groups.values()].map((g) => pushToUsers(g.userIds, g.message)))
}
