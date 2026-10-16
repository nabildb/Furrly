import { Router } from 'express'
import { z } from 'zod'
import { Prisma } from '../generated/prisma/client.js'
import { ReportType, Species } from '../generated/prisma/enums.js'
import { HttpError, parse } from '../lib/http.js'
import { prisma } from '../lib/prisma.js'
import { isOwnMediaUrl } from '../lib/storage.js'
import { requireAuth } from '../middleware/auth.js'

const MAX_PHOTOS = 3
// Margen para pequeñas diferencias de reloj entre el navegador y el servidor.
const CLOCK_SKEW_MS = 5 * 60 * 1000

// Campos que se pueden indicar al crear y cambiar al editar.
const editableFields = z.object({
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().min(10).max(2000),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  addressText: z
    .string()
    .trim()
    .max(200)
    .transform((s) => s || null)
    .nullable()
    .optional(),
  happenedAt: z.iso
    .datetime({ offset: true })
    .transform((d) => new Date(d))
    .refine((d) => d.getTime() <= Date.now() + CLOCK_SKEW_MS, 'La fecha no puede ser futura'),
  photoUrls: z.array(z.url()).max(MAX_PHOTOS).default([]),
})

const createReportSchema = editableFields
  .extend({
    type: z.enum(ReportType),
    petId: z.uuid().optional(),
    species: z.enum(Species).optional(),
  })
  .refine((r) => r.type !== 'lost' || r.petId, { message: 'Elige cuál de tus mascotas se ha perdido', path: ['petId'] })
  .refine((r) => r.type !== 'found' || r.species, { message: 'Indica la especie', path: ['species'] })

const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().min(1).max(50).default(10),
  type: z.enum(ReportType).optional(),
  species: z.enum(Species).optional(),
})

const NEARBY_LIMIT = 100

interface NearbyReportRow {
  id: string
  type: ReportType
  species: Species
  title: string
  address_text: string | null
  happened_at: Date
  lat: number
  lng: number
  distance_m: number
  photo_url: string | null
  pet_name: string | null
}

// Tipo y mascota no se cambian: si te equivocas de aviso, se cancela y se crea otro.
const updateReportSchema = editableFields
  .partial()
  .refine((r) => (r.lat === undefined) === (r.lng === undefined), {
    message: 'Indica latitud y longitud a la vez',
    path: ['lat'],
  })

const statusBodySchema = z.object({ status: z.enum(['resolved', 'cancelled']) })

function checkPhotos(photoUrls: string[] | undefined, userId: string) {
  if (photoUrls?.some((url) => !isOwnMediaUrl(url, userId))) {
    throw new HttpError(400, 'Las fotos deben estar subidas a tu carpeta de Furrly')
  }
}

export const reportsRouter = Router()

/**
 * Avisos activos en un radio alrededor de un punto, del más cercano al más lejano.
 * ST_DWithin sobre geography trabaja en metros y aprovecha el índice GIST de location.
 */
reportsRouter.get('/', async (req, res) => {
  const q = parse(nearbyQuerySchema, req.query)
  const origin = Prisma.sql`ST_SetSRID(ST_MakePoint(${q.lng}, ${q.lat}), 4326)::geography`

  const filters = [
    Prisma.sql`r.status = 'active'`,
    Prisma.sql`ST_DWithin(r.location, ${origin}, ${q.radiusKm * 1000})`,
  ]
  if (q.type) filters.push(Prisma.sql`r.type = ${q.type}::report_type`)
  if (q.species) filters.push(Prisma.sql`r.species = ${q.species}::species`)

  // Foto de portada: la primera del aviso o, si no tiene, la de la mascota.
  const rows = await prisma.$queryRaw<NearbyReportRow[]>`
    SELECT r.id, r.type, r.species, r.title, r.address_text, r.happened_at,
           ST_Y(r.location::geometry) AS lat,
           ST_X(r.location::geometry) AS lng,
           ST_Distance(r.location, ${origin}) AS distance_m,
           coalesce(
             (SELECT rp.url FROM report_photos rp WHERE rp.report_id = r.id ORDER BY rp.position LIMIT 1),
             p.photo_url
           ) AS photo_url,
           p.name AS pet_name
    FROM reports r
    LEFT JOIN pets p ON p.id = r.pet_id
    WHERE ${Prisma.join(filters, ' AND ')}
    ORDER BY distance_m
    LIMIT ${NEARBY_LIMIT}`

  res.json(
    rows.map((r) => ({
      id: r.id,
      type: r.type,
      species: r.species,
      title: r.title,
      addressText: r.address_text,
      happenedAt: r.happened_at,
      location: { lat: r.lat, lng: r.lng },
      distanceM: Math.round(r.distance_m),
      photoUrl: r.photo_url,
      // El mapa rotula los marcadores con el nombre (los avisos de encontrada no tienen mascota).
      petName: r.pet_name,
    })),
  )
})

reportsRouter.post('/', requireAuth, async (req, res) => {
  const userId = req.userId!
  const data = parse(createReportSchema, req.body)

  checkPhotos(data.photoUrls, userId)

  // Perdida: la mascota tiene que ser tuya, y la especie sale de su ficha.
  // Encontrada: es un animal desconocido, no se enlaza con ninguna mascota.
  let petId: string | null = null
  let species = data.species!
  if (data.type === 'lost') {
    const pet = await prisma.pet.findFirst({
      where: { id: data.petId, ownerId: userId },
      select: { id: true, species: true },
    })
    if (!pet) throw new HttpError(404, 'Mascota no encontrada')

    const alreadyLost = await prisma.report.findFirst({
      where: { petId: pet.id, type: 'lost', status: 'active' },
      select: { id: true },
    })
    if (alreadyLost) throw new HttpError(409, 'Esta mascota ya tiene un aviso de pérdida activo')

    petId = pet.id
    species = pet.species
  }

  // Prisma no puede escribir columnas geography, así que el INSERT es SQL
  // parametrizado. Ojo: ST_MakePoint recibe (longitud, latitud).
  const reportId = await prisma.$transaction(async (tx) => {
    const [{ id }] = await tx.$queryRaw<{ id: string }[]>`
      INSERT INTO reports (id, type, reporter_id, pet_id, species, title, description, location, address_text, happened_at)
      VALUES (
        gen_random_uuid(),
        ${data.type}::report_type,
        ${userId}::uuid,
        ${petId}::uuid,
        ${species}::species,
        ${data.title},
        ${data.description},
        ST_SetSRID(ST_MakePoint(${data.lng}, ${data.lat}), 4326)::geography,
        ${data.addressText ?? null},
        ${data.happenedAt}
      )
      RETURNING id`
    await tx.reportPhoto.createMany({
      data: data.photoUrls.map((url, position) => ({ reportId: id, url, position })),
    })
    return id
  })

  res.status(201).json(await getReport(reportId))
})

/** Editar un aviso activo propio. Solo cambia los campos que se envían. */
reportsRouter.patch('/:id', requireAuth, async (req, res) => {
  const userId = req.userId!
  const id = parse(z.uuid(), req.params.id)
  const { lat, lng, photoUrls, ...fields } = parse(updateReportSchema, req.body)
  checkPhotos(photoUrls, userId)

  const report = await prisma.report.findFirst({
    where: { id, reporterId: userId, status: 'active' },
    select: { id: true },
  })
  if (!report) throw new HttpError(404, 'Aviso no encontrado o ya cerrado')

  if (fields.happenedAt) {
    const firstSighting = await prisma.sighting.findFirst({
      where: { reportId: id },
      orderBy: { seenAt: 'asc' },
      select: { seenAt: true },
    })
    if (firstSighting && fields.happenedAt > firstSighting.seenAt) {
      throw new HttpError(400, 'La fecha no puede ser posterior al primer avistamiento')
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.report.update({ where: { id }, data: fields })
    if (lat !== undefined && lng !== undefined) {
      await tx.$executeRaw`
        UPDATE reports SET location = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
        WHERE id = ${id}::uuid`
    }
    // Las fotos se sustituyen por la lista nueva completa, en el orden recibido.
    if (photoUrls) {
      await tx.reportPhoto.deleteMany({ where: { reportId: id } })
      await tx.reportPhoto.createMany({ data: photoUrls.map((url, position) => ({ reportId: id, url, position })) })
    }
  })

  res.json(await getReport(id))
})

/** El autor marca el aviso como resuelto ("¡ya está en casa!") o lo cancela. */
reportsRouter.patch('/:id/status', requireAuth, async (req, res) => {
  const id = parse(z.uuid(), req.params.id)
  const { status } = parse(statusBodySchema, req.body)

  // updateMany permite filtrar por dueño y estado en la misma operación atómica.
  const { count } = await prisma.report.updateMany({
    where: { id, reporterId: req.userId, status: 'active' },
    data: { status, resolvedAt: status === 'resolved' ? new Date() : null },
  })
  if (count === 0) throw new HttpError(404, 'Aviso no encontrado o ya cerrado')

  res.json(await getReport(id))
})

reportsRouter.get('/:id', async (req, res) => {
  const id = parse(z.uuid(), req.params.id)
  const report = await getReport(id)
  if (!report) throw new HttpError(404, 'Aviso no encontrado')
  res.json(report)
})

async function getReport(id: string) {
  const report = await prisma.report.findUnique({
    where: { id },
    select: {
      id: true,
      type: true,
      status: true,
      species: true,
      title: true,
      description: true,
      addressText: true,
      happenedAt: true,
      resolvedAt: true,
      createdAt: true,
      reporter: { select: { username: true, displayName: true } },
      pet: { select: { id: true, name: true, breed: true, photoUrl: true } },
      photos: { select: { url: true }, orderBy: { position: 'asc' } },
    },
  })
  if (!report) return null

  const [{ lat, lng }] = await prisma.$queryRaw<{ lat: number; lng: number }[]>`
    SELECT ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng
    FROM reports WHERE id = ${id}::uuid`

  return { ...report, photos: report.photos.map((p) => p.url), location: { lat, lng } }
}

/** Avisos del usuario autenticado, en cualquier estado. Se monta en /me/reports. */
export const myReportsRouter = Router()

myReportsRouter.get('/', requireAuth, async (req, res) => {
  const reports = await prisma.report.findMany({
    where: { reporterId: req.userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      type: true,
      status: true,
      species: true,
      title: true,
      addressText: true,
      happenedAt: true,
      createdAt: true,
      pet: { select: { name: true, photoUrl: true } },
      photos: { select: { url: true }, orderBy: { position: 'asc' }, take: 1 },
      _count: { select: { sightings: true } },
    },
  })

  res.json(
    reports.map(({ photos, pet, _count, ...r }) => ({
      ...r,
      petName: pet?.name ?? null,
      photoUrl: photos[0]?.url ?? pet?.photoUrl ?? null,
      sightingsCount: _count.sightings,
    })),
  )
})
