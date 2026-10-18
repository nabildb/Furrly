import * as Sentry from '@sentry/node'
import type { Request } from 'express'
import { env } from './env.js'

if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.VERCEL_ENV,
    // Sin datos personales (IP, cabeceras, cuerpos) ni trazas de rendimiento: solo los errores.
    sendDefaultPii: false,
    tracesSampleRate: 0,
  })
}

/**
 * Manda a Sentry un error inesperado (los 500). Espera a que salga antes de responder: en Vercel
 * la función se congela al terminar la respuesta y el envío se perdería. Solo pasa con errores,
 * así que la espera (como mucho 2 s) no afecta a las peticiones normales.
 */
export async function reportError(err: unknown, req: Request) {
  if (!env.SENTRY_DSN) return
  Sentry.captureException(err, {
    // La ruta con sus parámetros (/reports/:id), no la URL real: así se agrupan y no lleva ids.
    tags: { method: req.method, route: req.route?.path ? `${req.baseUrl}${req.route.path}` : 'desconocida' },
  })
  await Sentry.flush(2000)
}
