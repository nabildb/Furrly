import * as Sentry from '@sentry/node'
import type { Request, Response } from 'express'
import { env } from './env.js'

if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.VERCEL_ENV,
    // Sentry 11 lo recoge todo por defecto: aquí se apaga todo lo que pueda llevar datos de usuarios.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
      stackFrameVariables: false,
    },
    // Solo los errores: nada de trazas de rendimiento.
    tracesSampleRate: 0,
    beforeSend(event) {
      delete event.user
      return event
    },
  })
}

/**
 * Manda a Sentry un error inesperado (los 500). Espera a que salga antes de responder: en Vercel
 * la función se congela al terminar la respuesta y el envío se perdería. Solo pasa con errores,
 * así que la espera (como mucho 2 s) no afecta a las peticiones normales.
 */
export async function reportError(err: unknown, req: Request, res: Response) {
  if (!env.SENTRY_DSN) return
  Sentry.captureException(err, {
    // La ruta con sus parámetros (/reports/:id), no la URL real: así se agrupan y no lleva ids.
    tags: { method: req.method, route: req.route?.path ? `${res.locals.mountPath ?? ''}${req.route.path}` : 'desconocida' },
  })
  await Sentry.flush(2000)
}
