import { compressImage } from './compressImage'
import { supabase } from './supabase'
import { thumbUrl } from './thumbUrl'

const BUCKET = 'media'
/** Límite del bucket (después de comprimir). Antes de comprimir se admite más: una foto de móvil pesa 3-5 MB o más. */
const MAX_BYTES = 5 * 1024 * 1024
const MAX_ORIGINAL_BYTES = 25 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
/** Lado mayor de las miniaturas: lo más grande que se pintan es unos 100 px en una pantalla de 3x. */
const THUMB_SIDE = 320

/**
 * Sube una imagen a Storage en <userId>/<folder>/<uuid>.<ext> y devuelve su URL pública.
 * Antes se comprime en el navegador (ver compressImage). Las políticas del bucket solo dejan
 * escribir en la carpeta del propio usuario. Las fotos llevan al lado una miniatura (ver thumbUrl):
 * si no se puede subir no pasa nada, la foto se guarda sin la marca `-t` y se usa entera.
 */
export async function uploadImage(original: File, userId: string, folder: string) {
  if (!ALLOWED_TYPES.includes(original.type)) throw new Error('La imagen debe ser JPG, PNG o WebP')
  if (original.size > MAX_ORIGINAL_BYTES) throw new Error('La imagen es demasiado grande')

  // Los avatares se ven pequeños: con 512 px sobra.
  const isAvatar = folder === 'avatars'
  const file = await compressImage(original, isAvatar ? 512 : 1600)
  if (file.size > MAX_BYTES) throw new Error('La imagen no puede pesar más de 5 MB')

  const upload = (name: string, image: File) =>
    supabase.storage.from(BUCKET).upload(`${userId}/${folder}/${name}`, image, { contentType: image.type })

  const id = crypto.randomUUID()
  const ext = file.type.split('/')[1]
  let name = `${id}.${ext}`
  const thumb = isAvatar ? file : await compressImage(file, THUMB_SIDE)
  if (thumb !== file && thumb.type === file.type) {
    const { error } = await upload(`${id}-thumb.${ext}`, thumb)
    if (!error) name = `${id}-t.${ext}`
  }

  const { error } = await upload(name, file)
  if (error) throw new Error('No se pudo subir la imagen')

  return supabase.storage.from(BUCKET).getPublicUrl(`${userId}/${folder}/${name}`).data.publicUrl
}

/** Borra una imagen a partir de su URL pública. Si falla, no es crítico: queda huérfana. */
export async function removeImage(publicUrl: string) {
  const marker = `/object/public/${BUCKET}/`
  const index = publicUrl.indexOf(marker)
  if (index === -1) return
  const path = publicUrl.slice(index + marker.length)
  await supabase.storage.from(BUCKET).remove([path, thumbUrl(path)])
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
