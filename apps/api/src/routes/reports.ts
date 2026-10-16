import { Router } from 'express'
import { z } from 'zod'
import { ReportType, Species } from '../generated/prisma/enums.js'
import { HttpError, parse } from '../lib/http.js'
import { prisma } from '../lib/prisma.js'
import { isOwnMediaUrl } from '../lib/storage.js'
import { requireAuth } from '../middleware/auth.js'

const MAX_PHOTOS = 3
// Margen para pequeñas diferencias de reloj entre el navegador y el servidor.
const CLOCK_SKEW_MS = 5 * 60 * 1000

const createReportSchema = z
  .object({
    type: z.enum(ReportType),
    petId: z.uuid().optional(),
    species: z.enum(Species).optional(),
    title: z.string().trim().min(3).max(100),
    description: z.string().trim().min(10).max(2000),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    addressText: z
      .string()
      .trim()
      .max(200)
      .transform((s) => s || null)
      .optional(),
    happenedAt: z.iso
      .datetime({ offset: true })
      .transform((d) => new Date(d))
      .refine((d) => d.getTime() <= Date.now() + CLOCK_SKEW_MS, 'La fecha no puede ser futura'),
    photoUrls: z.array(z.url()).max(MAX_PHOTOS).default([]),
  })
  .refine((r) => r.type !== 'lost' || r.petId, { message: 'Elige cuál de tus mascotas se ha perdido', path: ['petId'] })
  .refine((r) => r.type !== 'found' || r.species, { message: 'Indica la especie', path: ['species'] })

export const reportsRouter = Router()

reportsRouter.post('/', requireAuth, async (req, res) => {
  const userId = req.userId!
  const data = parse(createReportSchema, req.body)

  if (data.photoUrls.some((url) => !isOwnMediaUrl(url, userId))) {
    throw new HttpError(400, 'Las fotos deben estar subidas a tu carpeta de Furrly')
  }

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
