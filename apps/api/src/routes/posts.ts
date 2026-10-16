import { Router } from 'express'
import { z } from 'zod'
import type { Prisma } from '../generated/prisma/client.js'
import { HttpError, parse } from '../lib/http.js'
import { prisma } from '../lib/prisma.js'
import { isOwnMediaUrl } from '../lib/storage.js'
import { optionalAuth, requireAuth } from '../middleware/auth.js'

const PAGE_SIZE = 12

const idSchema = z.uuid()

const createPostSchema = z.object({
  petId: z.uuid(),
  imageUrl: z.url(),
  caption: z
    .string()
    .trim()
    .max(500)
    .transform((s) => s || null)
    .nullable()
    .optional(),
})

const commentSchema = z.object({ body: z.string().trim().min(1).max(500) })

/** ?cursor=<id del último post recibido>: paginación por cursor (keyset), estable aunque entren posts nuevos. */
const pageSchema = z.object({ cursor: z.uuid().optional() })

/** Lo que necesita una tarjeta del feed. likedByMe solo se calcula si hay sesión. */
function postSelect(userId: string | undefined) {
  return {
    id: true,
    imageUrl: true,
    caption: true,
    createdAt: true,
    pet: {
      select: {
        id: true,
        name: true,
        species: true,
        photoUrl: true,
        owner: { select: { username: true, displayName: true } },
      },
    },
    _count: { select: { likes: true, comments: true } },
    // Sin sesión no hay "mi like": take 0 en vez de filtrar por un id vacío (no es un UUID válido).
    likes: { where: { userId }, select: { userId: true }, take: userId ? 1 : 0 },
  } satisfies Prisma.PostSelect
}

type PostRow = Prisma.PostGetPayload<{ select: ReturnType<typeof postSelect> }>

function toPost({ _count, likes, ...post }: PostRow) {
  return { ...post, likesCount: _count.likes, commentsCount: _count.comments, likedByMe: likes.length > 0 }
}

/** Una página de posts más recientes primero, con el cursor para pedir la siguiente. */
export async function findPostsPage(where: Prisma.PostWhereInput, cursor: string | undefined, userId: string | undefined) {
  const rows = await prisma.post.findMany({
    where,
    select: postSelect(userId),
    // id como desempate: dos posts pueden tener el mismo createdAt.
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: PAGE_SIZE + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
  })
  const hasMore = rows.length > PAGE_SIZE
  const page = rows.slice(0, PAGE_SIZE)
  return { posts: page.map(toPost), nextCursor: hasMore ? page[page.length - 1].id : null }
}

/** El post y si quien pide es el dueño de la mascota. 404 si no existe. */
async function findPost(id: string) {
  const post = await prisma.post.findUnique({ where: { id }, select: { id: true, pet: { select: { ownerId: true } } } })
  if (!post) throw new HttpError(404, 'Publicación no encontrada')
  return post
}

async function likeState(postId: string, userId: string) {
  const [likesCount, mine] = await Promise.all([
    prisma.like.count({ where: { postId } }),
    prisma.like.count({ where: { postId, userId } }),
  ])
  return { likesCount, likedByMe: mine > 0 }
}

export const postsRouter = Router()

/** Explorar: las publicaciones más recientes de todo Furrly. */
postsRouter.get('/', optionalAuth, async (req, res) => {
  const { cursor } = parse(pageSchema, req.query)
  res.json(await findPostsPage({}, cursor, req.userId))
})

postsRouter.get('/:id', optionalAuth, async (req, res) => {
  const id = parse(idSchema, req.params.id)
  const post = await prisma.post.findUnique({ where: { id }, select: postSelect(req.userId) })
  if (!post) throw new HttpError(404, 'Publicación no encontrada')
  res.json(toPost(post))
})

postsRouter.post('/', requireAuth, async (req, res) => {
  const userId = req.userId!
  const data = parse(createPostSchema, req.body)
  if (!isOwnMediaUrl(data.imageUrl, userId)) throw new HttpError(400, 'La foto debe estar subida a tu carpeta de Furrly')
  const pet = await prisma.pet.findFirst({ where: { id: data.petId, ownerId: userId }, select: { id: true } })
  if (!pet) throw new HttpError(404, 'Mascota no encontrada')

  const post = await prisma.post.create({ data, select: postSelect(userId) })
  res.status(201).json(toPost(post))
})

postsRouter.delete('/:id', requireAuth, async (req, res) => {
  const post = await findPost(parse(idSchema, req.params.id))
  // 404 y no 403: no confirmamos a terceros qué se puede borrar.
  if (post.pet.ownerId !== req.userId) throw new HttpError(404, 'Publicación no encontrada')
  await prisma.post.delete({ where: { id: post.id } })
  res.status(204).end()
})

// Likes: PUT y DELETE idempotentes (la PK es usuario+post), así repetir un clic no falla.
postsRouter.put('/:id/like', requireAuth, async (req, res) => {
  const { id } = await findPost(parse(idSchema, req.params.id))
  const userId = req.userId!
  await prisma.like.upsert({
    where: { userId_postId: { userId, postId: id } },
    create: { userId, postId: id },
    update: {},
  })
  res.json(await likeState(id, userId))
})

postsRouter.delete('/:id/like', requireAuth, async (req, res) => {
  const { id } = await findPost(parse(idSchema, req.params.id))
  await prisma.like.deleteMany({ where: { postId: id, userId: req.userId } })
  res.json(await likeState(id, req.userId!))
})

const commentSelect = {
  id: true,
  body: true,
  createdAt: true,
  user: { select: { username: true, displayName: true, avatarUrl: true } },
} as const

postsRouter.get('/:id/comments', async (req, res) => {
  const { id } = await findPost(parse(idSchema, req.params.id))
  const comments = await prisma.comment.findMany({
    where: { postId: id },
    select: commentSelect,
    orderBy: { createdAt: 'asc' },
    take: 200,
  })
  res.json(comments)
})

postsRouter.post('/:id/comments', requireAuth, async (req, res) => {
  const { id } = await findPost(parse(idSchema, req.params.id))
  const { body } = parse(commentSchema, req.body)
  const comment = await prisma.comment.create({ data: { postId: id, userId: req.userId!, body }, select: commentSelect })
  res.status(201).json(comment)
})

/** Borra quien escribió el comentario o el dueño de la mascota del post (moderar su publicación). */
postsRouter.delete('/:id/comments/:commentId', requireAuth, async (req, res) => {
  const post = await findPost(parse(idSchema, req.params.id))
  const commentId = parse(idSchema, req.params.commentId)
  const isPostOwner = post.pet.ownerId === req.userId
  const { count } = await prisma.comment.deleteMany({
    where: { id: commentId, postId: post.id, ...(isPostOwner ? {} : { userId: req.userId }) },
  })
  if (count === 0) throw new HttpError(404, 'Comentario no encontrado')
  res.status(204).end()
})

/** Feed personal: lo de las mascotas que sigo más lo de las mías. Se monta en /feed. */
export const feedRouter = Router()

feedRouter.get('/', requireAuth, async (req, res) => {
  const { cursor } = parse(pageSchema, req.query)
  const userId = req.userId!
  const where = { pet: { OR: [{ ownerId: userId }, { followers: { some: { followerId: userId } } }] } }
  res.json(await findPostsPage(where, cursor, userId))
})
