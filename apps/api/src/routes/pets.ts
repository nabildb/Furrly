import { Router } from 'express'
import { z } from 'zod'
import { PetSex, Species } from '../generated/prisma/enums.js'
import { HttpError, parse } from '../lib/http.js'
import { prisma } from '../lib/prisma.js'
import { isOwnMediaUrl } from '../lib/storage.js'
import { optionalAuth, requireAuth } from '../middleware/auth.js'
import { notify } from '../lib/notifications.js'
import { findPostsPage } from './posts.js'

// Campos públicos: el microchip solo lo ve el dueño.
const publicPetSelect = {
  id: true,
  name: true,
  species: true,
  breed: true,
  sex: true,
  birthDate: true,
  color: true,
  description: true,
  photoUrl: true,
  createdAt: true,
  owner: { select: { username: true, displayName: true } },
} as const

const ownerPetSelect = { ...publicPetSelect, microchip: true } as const

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((s) => s || null)
    .nullable()
    .optional()

const petBodySchema = z.object({
  name: z.string().trim().min(1).max(40),
  species: z.enum(Species),
  breed: optionalText(60),
  sex: z.enum(PetSex).default('unknown'),
  birthDate: z.iso
    .date()
    .transform((d) => new Date(d))
    .refine((d) => d <= new Date(), 'La fecha de nacimiento no puede ser futura')
    .nullable()
    .optional(),
  color: optionalText(60),
  description: optionalText(500),
  photoUrl: z.url().nullable().optional(),
  microchip: optionalText(20),
})

const idSchema = z.uuid()

function checkPhoto(photoUrl: string | null | undefined, userId: string) {
  if (photoUrl && !isOwnMediaUrl(photoUrl, userId)) {
    throw new HttpError(400, 'La foto debe estar subida a tu carpeta de Furrly')
  }
}

/** Devuelve la mascota si existe y es del usuario; si no, 404 (no revelamos si existe). */
async function findOwnPet(id: string, userId: string) {
  const pet = await prisma.pet.findFirst({ where: { id, ownerId: userId }, select: { id: true } })
  if (!pet) throw new HttpError(404, 'Mascota no encontrada')
  return pet
}

export const petsRouter = Router()

/** Seguidores y publicaciones de la mascota, y si quien pide (si hay sesión) la sigue. */
async function socialStats(petId: string, userId: string | undefined) {
  const [followersCount, postsCount, following] = await Promise.all([
    prisma.follow.count({ where: { petId } }),
    prisma.post.count({ where: { petId } }),
    userId ? prisma.follow.count({ where: { petId, followerId: userId } }) : 0,
  ])
  return { followersCount, postsCount, followedByMe: following > 0 }
}

petsRouter.get('/:id', optionalAuth, async (req, res) => {
  const id = parse(idSchema, req.params.id)
  const pet = await prisma.pet.findUnique({ where: { id }, select: publicPetSelect })
  if (!pet) throw new HttpError(404, 'Mascota no encontrada')
  res.json({ ...pet, ...(await socialStats(id, req.userId)) })
})

petsRouter.get('/:id/posts', optionalAuth, async (req, res) => {
  const id = parse(idSchema, req.params.id)
  const { cursor } = parse(z.object({ cursor: z.uuid().optional() }), req.query)
  res.json(await findPostsPage({ petId: id }, cursor, req.userId))
})

// Seguir: PUT y DELETE idempotentes. No tiene sentido seguir a tus propias mascotas.
petsRouter.put('/:id/follow', requireAuth, async (req, res) => {
  const userId = req.userId!
  const id = parse(idSchema, req.params.id)
  const pet = await prisma.pet.findUnique({ where: { id }, select: { ownerId: true } })
  if (!pet) throw new HttpError(404, 'Mascota no encontrada')
  if (pet.ownerId === userId) throw new HttpError(400, 'No puedes seguir a tus propias mascotas')
  const { count } = await prisma.follow.createMany({ data: [{ followerId: userId, petId: id }], skipDuplicates: true })
  if (count > 0) await notify({ userId: pet.ownerId, type: 'new_follower', actorId: userId, petId: id })
  res.json(await socialStats(id, userId))
})

petsRouter.delete('/:id/follow', requireAuth, async (req, res) => {
  const id = parse(idSchema, req.params.id)
  await prisma.follow.deleteMany({ where: { petId: id, followerId: req.userId } })
  res.json(await socialStats(id, req.userId))
})

petsRouter.post('/', requireAuth, async (req, res) => {
  const userId = req.userId!
  const data = parse(petBodySchema, req.body)
  checkPhoto(data.photoUrl, userId)
  const pet = await prisma.pet.create({ data: { ...data, ownerId: userId }, select: ownerPetSelect })
  res.status(201).json(pet)
})

petsRouter.patch('/:id', requireAuth, async (req, res) => {
  const userId = req.userId!
  const id = parse(idSchema, req.params.id)
  const data = parse(petBodySchema.partial(), req.body)
  checkPhoto(data.photoUrl, userId)
  await findOwnPet(id, userId)
  const pet = await prisma.pet.update({ where: { id }, data, select: ownerPetSelect })
  res.json(pet)
})

petsRouter.delete('/:id', requireAuth, async (req, res) => {
  const id = parse(idSchema, req.params.id)
  await findOwnPet(id, req.userId!)
  await prisma.pet.delete({ where: { id } })
  res.status(204).end()
})

/** Mascotas del usuario autenticado, con microchip. Se monta en /me/pets. */
export const myPetsRouter = Router()

myPetsRouter.get('/', requireAuth, async (req, res) => {
  const pets = await prisma.pet.findMany({
    where: { ownerId: req.userId },
    select: ownerPetSelect,
    orderBy: { createdAt: 'asc' },
  })
  res.json(pets)
})

/** Mascotas públicas de un usuario. Se monta en /users/:username/pets. */
export const userPetsRouter = Router({ mergeParams: true })

userPetsRouter.get('/', async (req, res) => {
  const { username } = req.params as { username: string }
  const pets = await prisma.pet.findMany({
    where: { owner: { username: username.toLowerCase() } },
    select: publicPetSelect,
    orderBy: { createdAt: 'asc' },
  })
  res.json(pets)
})
