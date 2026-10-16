import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

// Mismo formato que el CHECK de la base de datos.
const usernameSchema = z.string().regex(/^[a-z0-9_]{3,30}$/)

export const usernamesRouter = Router()

/**
 * Permite al frontend comprobar el username antes del signUp de Supabase:
 * si el trigger que crea el perfil fallase por username repetido, Supabase
 * solo devolvería un error genérico.
 */
usernamesRouter.get('/:username/available', async (req, res) => {
  const parsed = usernameSchema.safeParse(req.params.username)
  if (!parsed.success) {
    res.status(400).json({ error: 'Formato no válido: 3-30 caracteres, minúsculas, números o _' })
    return
  }
  const existing = await prisma.user.findUnique({ where: { username: parsed.data }, select: { id: true } })
  res.json({ available: !existing })
})
