import { Router } from 'express'
import { z } from 'zod'
import { HttpError, parse } from '../lib/http.js'
import { prisma } from '../lib/prisma.js'
import { isOwnMediaUrl } from '../lib/storage.js'
import { notify } from '../lib/notifications.js'
import { requireAuth } from '../middleware/auth.js'

// Margen para pequeñas diferencias de reloj entre el navegador y el servidor.
const CLOCK_SKEW_MS = 5 * 60 * 1000

const createSightingSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  seenAt: z.iso
    .datetime({ offset: true })
    .transform((d) => new Date(d))
    .refine((d) => d.getTime() <= Date.now() + CLOCK_SKEW_MS, 'La fecha no puede ser futura'),
  note: z
    .string()
    .trim()
    .max(300)
    .transform((s) => s || null)
    .optional(),
  photoUrl: z.url().nullable().optional(),
})

interface SightingRow {
  id: string
  seen_at: Date
  note: string | null
  photo_url: string | null
  created_at: Date
  lat: number
  lng: number
  username: string
  display_name: string
}

/** Avistamientos de un aviso. Se monta en /reports/:reportId/sightings. */
export const sightingsRouter = Router({ mergeParams: true })

function reportIdFrom(params: unknown) {
  return parse(z.uuid(), (params as { reportId: string }).reportId)
}

sightingsRouter.get('/', async (req, res) => {
  const reportId = reportIdFrom(req.params)
  // Orden cronológico: así el frontend puede dibujar el recorrido.
  const rows = await prisma.$queryRaw<SightingRow[]>`
    SELECT s.id, s.seen_at, s.note, s.photo_url, s.created_at,
           ST_Y(s.location::geometry) AS lat,
           ST_X(s.location::geometry) AS lng,
           u.username, u.display_name
    FROM sightings s
    JOIN users u ON u.id = s.user_id
    WHERE s.report_id = ${reportId}::uuid
    ORDER BY s.seen_at`

  res.json(
    rows.map((s) => ({
      id: s.id,
      seenAt: s.seen_at,
      note: s.note,
      photoUrl: s.photo_url,
      createdAt: s.created_at,
      location: { lat: s.lat, lng: s.lng },
      user: { username: s.username, displayName: s.display_name },
    })),
  )
})

sightingsRouter.post('/', requireAuth, async (req, res) => {
  const userId = req.userId!
  const reportId = reportIdFrom(req.params)
  const data = parse(createSightingSchema, req.body)

  if (data.photoUrl && !isOwnMediaUrl(data.photoUrl, userId)) {
    throw new HttpError(400, 'La foto debe estar subida a tu carpeta de Furrly')
  }

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: { type: true, status: true, happenedAt: true, reporterId: true },
  })
  if (!report) throw new HttpError(404, 'Aviso no encontrado')
  // Solo tiene sentido "la he visto" para una mascota que alguien está buscando.
  if (report.type !== 'lost') throw new HttpError(400, 'Solo se pueden añadir avistamientos a mascotas perdidas')
  if (report.status !== 'active') throw new HttpError(409, 'Este aviso ya está cerrado')
  if (data.seenAt.getTime() < report.happenedAt.getTime() - CLOCK_SKEW_MS) {
    throw new HttpError(400, 'El avistamiento no puede ser anterior a la pérdida')
  }

  // Prisma no puede escribir columnas geography: INSERT parametrizado (ST_MakePoint es lng, lat).
  const [{ id }] = await prisma.$queryRaw<{ id: string }[]>`
    INSERT INTO sightings (id, report_id, user_id, location, seen_at, note, photo_url)
    VALUES (
      gen_random_uuid(),
      ${reportId}::uuid,
      ${userId}::uuid,
      ST_SetSRID(ST_MakePoint(${data.lng}, ${data.lat}), 4326)::geography,
      ${data.seenAt},
      ${data.note ?? null},
      ${data.photoUrl ?? null}
    )
    RETURNING id`

  await notify({ userId: report.reporterId, type: 'new_sighting', actorId: userId, reportId })
  res.status(201).json({ id })
})

/** Puede borrarlo quien lo creó o el autor del aviso (p. ej. para quitar avistamientos falsos). */
sightingsRouter.delete('/:sightingId', requireAuth, async (req, res) => {
  const reportId = reportIdFrom(req.params)
  const sightingId = parse(z.uuid(), req.params.sightingId)

  const { count } = await prisma.sighting.deleteMany({
    where: {
      id: sightingId,
      reportId,
      OR: [{ userId: req.userId }, { report: { reporterId: req.userId } }],
    },
  })
  if (count === 0) throw new HttpError(404, 'Avistamiento no encontrado')

  res.status(204).end()
})
