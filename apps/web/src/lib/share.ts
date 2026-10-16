/**
 * Comparte la página actual con el menú nativo del móvil (Web Share API) o, si el navegador
 * no lo tiene (escritorio), copia el enlace. Devuelve qué ha pasado para avisar al usuario.
 */
export async function shareCurrentPage(title: string): Promise<'shared' | 'copied' | 'cancelled'> {
  const url = window.location.href
  if (navigator.share) {
    try {
      await navigator.share({ title, url })
      return 'shared'
    } catch {
      return 'cancelled'
    }
  }
  await navigator.clipboard.writeText(url)
  return 'copied'
}
