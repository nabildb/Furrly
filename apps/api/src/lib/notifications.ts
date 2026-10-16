import type { NotificationType } from '../generated/prisma/enums.js'
import { prisma } from './prisma.js'

/** Radio máximo de alerta (CHECK users_alert_radius_km_check): sirve de prefiltro para el índice GiST. */
const MAX_ALERT_RADIUS_M = 50_000

interface NotifyInput {
  userId: string
  type: NotificationType
  actorId: string
  reportId?: string
  postId?: string
  petId?: string
}

/** Crea una notificación, salvo que quien la provoca sea el propio destinatario. */
export async function notify({ userId, actorId, ...rest }: NotifyInput) {
  if (userId === actorId) return
  await prisma.notification.create({ data: { userId, actorId, ...rest } })
}

/**
 * Aviso nuevo: avisa a los vecinos cuya zona de alertas lo cubre. Cada uno tiene su propio radio,
 * así que el filtro exacto usa alert_radius_km de cada fila; el ST_DWithin con el radio máximo
 * va antes para que Postgres pueda usar el índice GiST de users.alert_location.
 * Devuelve a cuántos vecinos se ha avisado.
 */
export async function notifyReportNearby(reportId: string, reporterId: string) {
  return prisma.$executeRaw`
    INSERT INTO notifications (id, user_id, type, actor_id, report_id)
    SELECT gen_random_uuid(), u.id, 'new_report_nearby', ${reporterId}::uuid, r.id
    FROM reports r
    JOIN users u ON u.alert_location IS NOT NULL
      AND ST_DWithin(u.alert_location, r.location, ${MAX_ALERT_RADIUS_M})
      AND ST_DWithin(u.alert_location, r.location, u.alert_radius_km * 1000)
    WHERE r.id = ${reportId}::uuid AND u.id <> ${reporterId}::uuid`
}

/** Aviso resuelto: se lo contamos a quienes ayudaron con avistamientos. */
export async function notifyReportResolved(reportId: string, reporterId: string) {
  return prisma.$executeRaw`
    INSERT INTO notifications (id, user_id, type, actor_id, report_id)
    SELECT gen_random_uuid(), s.user_id, 'report_resolved', ${reporterId}::uuid, ${reportId}::uuid
    FROM (SELECT DISTINCT user_id FROM sightings WHERE report_id = ${reportId}::uuid) s
    WHERE s.user_id <> ${reporterId}::uuid`
}
