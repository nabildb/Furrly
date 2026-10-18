import type { NextFunction, Request, Response } from 'express'
import { z, type ZodType } from 'zod'
import { reportError } from './sentry.js'

z.config(z.locales.es())

/** Error con código HTTP que el errorHandler convierte en respuesta JSON. */
export class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** Valida datos de entrada con zod; si no cuadran, responde 400 con el detalle. */
export function parse<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) throw new HttpError(400, z.prettifyError(result.error))
  return result.data
}

// Express 5 pasa aquí también los errores de los handlers async.
export async function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message })
    return
  }
  // Errores de express.json: JSON mal formado (400) o cuerpo demasiado grande (413).
  // Son culpa de la petición, no del servidor: no deben acabar como 500 ni llenar el log.
  const status = (err as { status?: unknown; expose?: unknown }).status
  if (typeof status === 'number' && status >= 400 && status < 500 && (err as { expose?: unknown }).expose) {
    res.status(status).json({ error: status === 413 ? 'La petición es demasiado grande' : 'Petición mal formada' })
    return
  }
  console.error(err)
  await reportError(err, req)
  res.status(500).json({ error: 'Error interno del servidor' })
}
