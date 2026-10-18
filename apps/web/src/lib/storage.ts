import { compressImage } from './compressImage'
import { supabase } from './supabase'

const BUCKET = 'media'
/** Límite del bucket (después de comprimir). Antes de comprimir se admite más: una foto de móvil pesa 3-5 MB o más. */
const MAX_BYTES = 5 * 1024 * 1024
const MAX_ORIGINAL_BYTES = 25 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Sube una imagen a Storage en <userId>/<folder>/<uuid>.<ext> y devuelve su URL pública.
 * Antes se comprime en el navegador (ver compressImage). Las políticas del bucket solo dejan
 * escribir en la carpeta del propio usuario.
 */
export async function uploadImage(original: File, userId: string, folder: string) {
  if (!ALLOWED_TYPES.includes(original.type)) throw new Error('La imagen debe ser JPG, PNG o WebP')
  if (original.size > MAX_ORIGINAL_BYTES) throw new Error('La imagen es demasiado grande')

  // Los avatares se ven pequeños: con 512 px sobra.
  const file = await compressImage(original, folder === 'avatars' ? 512 : 1600)
  if (file.size > MAX_BYTES) throw new Error('La imagen no puede pesar más de 5 MB')

  const ext = file.type.split('/')[1]
  const path = `${userId}/${folder}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type })
  if (error) throw new Error('No se pudo subir la imagen')

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

/** Borra una imagen a partir de su URL pública. Si falla, no es crítico: queda huérfana. */
export async function removeImage(publicUrl: string) {
  const marker = `/object/public/${BUCKET}/`
  const index = publicUrl.indexOf(marker)
  if (index === -1) return
  await supabase.storage.from(BUCKET).remove([publicUrl.slice(index + marker.length)])
}

const USER_FOLDERS = ['avatars', 'pets', 'reports', 'posts', 'sightings']

/** Borra todas las fotos del usuario (antes de eliminar su cuenta). Lo que falle queda huérfano, no es crítico. */
export async function removeUserFolder(userId: string) {
  for (const folder of USER_FOLDERS) {
    const { data } = await supabase.storage.from(BUCKET).list(`${userId}/${folder}`, { limit: 1000 })
    const paths = (data ?? []).map((file) => `${userId}/${folder}/${file.name}`)
    if (paths.length > 0) await supabase.storage.from(BUCKET).remove(paths)
  }
}
