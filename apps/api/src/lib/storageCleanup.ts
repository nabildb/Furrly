import { env } from './env.js'
import { prisma } from './prisma.js'

const BUCKET = 'media'

/**
 * Fotos del bucket que ya no usa nadie: avisos o publicaciones borrados, formularios que se
 * abandonaron después de subir la foto... Solo las de hace más de un día, para no borrar la de
 * alguien que está a medio publicar.
 */
export async function findOrphanPhotos(limit = 500) {
  const [{ hasStorage }] = await prisma.$queryRaw<{ hasStorage: boolean }[]>`
    SELECT to_regclass('storage.objects') IS NOT NULL AS "hasStorage"`
  if (!hasStorage) return []

  const rows = await prisma.$queryRaw<{ name: string }[]>`
    WITH used AS (
      SELECT split_part(url, '/object/public/media/', 2) AS name
      FROM (
        SELECT avatar_url AS url FROM users
        UNION ALL SELECT photo_url FROM pets
        UNION ALL SELECT url FROM report_photos
        UNION ALL SELECT image_url FROM posts
        UNION ALL SELECT photo_url FROM sightings
      ) all_urls
      WHERE url LIKE '%/object/public/media/%'
    )
    SELECT o.name FROM storage.objects o
    WHERE o.bucket_id = ${BUCKET}
      AND o.created_at < now() - interval '1 day'
      AND NOT EXISTS (SELECT 1 FROM used WHERE used.name = o.name)
    ORDER BY o.created_at
    LIMIT ${limit}`
  return rows.map((r) => r.name)
}

/**
 * Las borra con la API de Storage (borrar la fila de storage.objects con SQL dejaría el archivo
 * ocupando espacio). Necesita la clave de servicio: solo se usa aquí, nunca llega al navegador.
 */
export async function deletePhotos(names: string[]) {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY')
  for (let i = 0; i < names.length; i += 100) {
    const res = await fetch(`${env.SUPABASE_URL}/storage/v1/object/${BUCKET}`, {
      method: 'DELETE',
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prefixes: names.slice(i, i + 100) }),
    })
    if (!res.ok) throw new Error(`Storage respondió ${res.status}`)
  }
  return names.length
}
