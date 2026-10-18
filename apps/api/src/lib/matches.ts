import { prisma } from './prisma.js'
import { pushNotifications } from './push.js'
import { ringNotifications } from './realtime.js'

/** Distancia máxima entre donde se perdió y donde se encontró para proponerlo como coincidencia. */
export const MATCH_RADIUS_M = 5000

export interface Match {
  id: string
  type: 'lost' | 'found'
  title: string
  addressText: string | null
  happenedAt: Date
  distanceM: number
  photoUrl: string | null
  petName: string | null
  reporterId: string
}

/**
 * Avisos que podrían ser el mismo animal: del tipo contrario (perdido ↔ encontrado), activos, de la
 * misma especie, a menos de 5 km y con fechas que encajan. Lo encontrado puede ser como mucho un día
 * anterior a la pérdida (por si alguien se equivoca de hora) y hasta 30 días posterior.
 * Nunca entre avisos de la misma persona ni si hay un bloqueo entre ellos.
 */
export async function findMatches(reportId: string) {
  return prisma.$queryRaw<Match[]>`
    SELECT o.id, o.type::text AS type, o.title, o.address_text AS "addressText", o.happened_at AS "happenedAt",
           ST_Distance(o.location, me.location)::int AS "distanceM",
           coalesce((SELECT url FROM report_photos p WHERE p.report_id = o.id ORDER BY position LIMIT 1), pet.photo_url) AS "photoUrl",
           pet.name AS "petName", o.reporter_id AS "reporterId"
    FROM reports me
    JOIN reports o ON o.type <> me.type
      AND o.species = me.species
      AND o.status = 'active'
      AND o.reporter_id <> me.reporter_id
      AND ST_DWithin(o.location, me.location, ${MATCH_RADIUS_M})
    LEFT JOIN pets pet ON pet.id = o.pet_id
    WHERE me.id = ${reportId}::uuid
      AND me.status = 'active'
      AND (
        (me.type = 'lost' AND o.happened_at BETWEEN me.happened_at - interval '1 day' AND me.happened_at + interval '30 days')
        OR (me.type = 'found' AND o.happened_at BETWEEN me.happened_at - interval '30 days' AND me.happened_at + interval '1 day')
      )
      AND NOT EXISTS (
        SELECT 1 FROM user_blocks b
        WHERE (b.blocker_id = me.reporter_id AND b.blocked_id = o.reporter_id)
           OR (b.blocker_id = o.reporter_id AND b.blocked_id = me.reporter_id)
      )
    ORDER BY "distanceM"
    LIMIT 10`
}

/**
 * Aviso nuevo: si hay coincidencias, se avisa a los dos lados. Al dueño del aviso que ya existía,
 * del nuevo; y a quien acaba de publicar, de cada coincidencia. Devuelve cuántas hay.
 */
export async function notifyMatches(reportId: string, reporterId: string) {
  const matches = await findMatches(reportId)
  if (matches.length === 0) return 0
  const created = await prisma.notification.createManyAndReturn({
    data: matches.flatMap((m) => [
      { userId: m.reporterId, type: 'possible_match' as const, actorId: reporterId, reportId },
      { userId: reporterId, type: 'possible_match' as const, actorId: m.reporterId, reportId: m.id },
    ]),
    select: { id: true },
  })
  const ids = created.map((n) => n.id)
  await Promise.all([pushNotifications(ids), ringNotifications(ids)])
  return matches.length
}
