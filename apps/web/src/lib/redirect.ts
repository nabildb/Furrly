/**
 * Solo se vuelve a rutas internas tras el login. Evita una "open redirect": que un enlace
 * manipulado lleve al usuario, ya autenticado, a otra web ("//evil.com" o "/\evil.com" son
 * URLs de otro dominio para el navegador).
 */
export function safeRedirect(path: unknown, fallback = '/avisos') {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) return fallback
  return path
}
