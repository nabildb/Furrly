import { env } from './env.js'
import { prisma } from './prisma.js'

export type RingEvent = 'message' | 'notification'

/**
 * "Toca el timbre" de esos usuarios por su canal privado de Supabase Realtime (user:<id>): la web,
 * al oírlo, pide los datos a la API. Por el canal solo viaja el aviso (y como mucho un id), nunca el
 * contenido, así que todos los permisos siguen en la API. Solo cada usuario puede escuchar su canal
 * (política RLS en realtime.messages, ver la migración realtime_channels).
 * Nunca lanza: si falla, la web se entera igual con la consulta periódica.
 */
export async function ring(userIds: string[], event: RingEvent, payload: Record<string, string> = {}) {
  if (!env.SUPABASE_SERVICE_ROLE_KEY || userIds.length === 0) return
  try {
    await fetch(`${env.SUPABASE_URL}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [...new Set(userIds)].map((id) => ({ topic: `user:${id}`, event, payload, private: true })),
      }),
    })
  } catch {
    // La consulta periódica de la web hace de red de seguridad.
  }
}

/** Timbre para los destinatarios de unas notificaciones recién creadas (globos de no leídos). */
export async function ringNotifications(notificationIds: string[]) {
  if (notificationIds.length === 0) return
  const rows = await prisma.notification.findMany({ where: { id: { in: notificationIds } }, select: { userId: true } })
  await ring(rows.map((r) => r.userId), 'notification')
}
