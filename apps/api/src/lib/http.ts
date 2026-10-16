import type { NextFunction, Request, Response } from 'express'
import { z, type ZodType } from 'zod'

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
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message })
    return
  }
  console.error(err)
  res.status(500).json({ error: 'Error interno del servidor' })
}
