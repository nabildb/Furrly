import { supabase } from './supabase'

const BUCKET = 'media'
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Sube una imagen a Storage en <userId>/<folder>/<uuid>.<ext> y devuelve su URL pública.
 * Las políticas del bucket solo dejan escribir en la carpeta del propio usuario.
 */
export async function uploadImage(file: File, userId: string, folder: string) {
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error('La imagen debe ser JPG, PNG o WebP')
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
