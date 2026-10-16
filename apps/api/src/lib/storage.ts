import { env } from './env.js'

const MEDIA_PUBLIC_URL = `${env.SUPABASE_URL}/storage/v1/object/public/media/`

/**
 * Las fotos las sube el frontend directamente a Storage, así que la API solo
 * acepta URLs de nuestro bucket y dentro de la carpeta del propio usuario.
 */
export function isOwnMediaUrl(url: string, userId: string) {
  return url.startsWith(`${MEDIA_PUBLIC_URL}${userId}/`)
}
