/** Tamaño final manteniendo la proporción: el lado mayor como mucho `maxSide` (nunca se amplía). */
export function fitInside(width: number, height: number, maxSide: number) {
  const scale = Math.min(1, maxSide / Math.max(width, height))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))
}

/**
 * Reduce una foto antes de subirla: lado mayor a `maxSide` px y WebP al 80 % (JPEG si el navegador
 * no sabe generar WebP, como Safari). Una foto de móvil pasa de 3-5 MB a unos 200-300 kB.
 * Al redibujarla se pierden los metadatos EXIF, incluida la ubicación GPS de donde se hizo.
 * Si algo falla, o el resultado no es más pequeño, se devuelve la original.
 */
export async function compressImage(file: File, maxSide = 1600): Promise<File> {
  let bitmap: ImageBitmap
  try {
    // from-image: respeta la orientación EXIF (las fotos verticales del móvil no salen tumbadas).
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return file
  }

  const { width, height } = fitInside(bitmap.width, bitmap.height, maxSide)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  let blob = await toBlob(canvas, 'image/webp', 0.8)
  // Safari no codifica WebP: devuelve PNG, que pesaría más que la original.
  if (!blob || blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', 0.82)
  if (!blob || blob.size >= file.size) return file

  const name = file.name.replace(/\.[^.]+$/, '') + (blob.type === 'image/webp' ? '.webp' : '.jpg')
  return new File([blob], name, { type: blob.type })
}
