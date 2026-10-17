import { Router } from 'express'
import { z } from 'zod'
import { HttpError, parse } from '../lib/http.js'
import { prisma } from '../lib/prisma.js'
import { pushToUsersDetailed, vapidKeys } from '../lib/push.js'
import { isPushServiceUrl } from '../lib/webpush.js'
import { requireAuth } from '../middleware/auth.js'

const base64urlBytes = (bytes: number) =>
  z
    .string()
    .regex(/^[A-Za-z0-9_-]+$/)
    .refine((s) => Buffer.from(s, 'base64url').length === bytes, `Debe ocupar ${bytes} bytes`)

const subscriptionSchema = z.object({
  endpoint: z.url().refine(isPushServiceUrl, 'Servicio de push no admitido'),
  keys: z.object({ p256dh: base64urlBytes(65), auth: base64urlBytes(16) }),
})

/** Suscripciones de Web Push. Se monta en /push. */
export const pushRouter = Router()

/** Clave pública VAPID que el navegador necesita para suscribirse. */
pushRouter.get('/key', (_req, res) => {
  if (!vapidKeys) throw new HttpError(503, 'Los avisos push no están configurados')
  res.json({ publicKey: vapidKeys.publicKey })
})

/** Guarda la suscripción de este navegador. Si el dispositivo ya estaba registrado (otra cuenta), pasa a la actual. */
pushRouter.post('/subscriptions', requireAuth, async (req, res) => {
  const { endpoint, keys } = parse(subscriptionSchema, req.body)
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, userId: req.userId! },
    update: { p256dh: keys.p256dh, auth: keys.auth, userId: req.userId! },
  })
  res.status(201).json({ ok: true })
})

pushRouter.delete('/subscriptions', requireAuth, async (req, res) => {
  const { endpoint } = parse(z.object({ endpoint: z.string() }), req.body)
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: req.userId } })
  res.status(204).end()
})

/**
 * Aviso de prueba a los dispositivos propios: comprueba de punta a punta que el push llega.
 * Devuelve lo que contestó cada servicio de push, para diagnosticar si algo falla.
 */
pushRouter.post('/test', requireAuth, async (req, res) => {
  if (!vapidKeys) throw new HttpError(503, 'Los avisos push no están configurados')
  const results = await pushToUsersDetailed([req.userId!], {
    title: 'Furrly',
    body: '¡Los avisos funcionan en este dispositivo!',
    url: '/perfil',
    tag: 'prueba',
  })
  res.json({ sent: results.filter((r) => r.status >= 200 && r.status < 300).length, results })
})

