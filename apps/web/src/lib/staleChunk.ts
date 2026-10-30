const KEY = 'furrly:recargada-por-version'
/** Si ya se recargó hace menos de esto, el problema no es una versión vieja: se deja ver el error. */
const COOLDOWN_MS = 60_000

function recentlyReloaded() {
  try {
    return Date.now() - Number(sessionStorage.getItem(KEY)) < COOLDOWN_MS
  } catch {
    return true // Sin sessionStorage no hay forma de evitar un bucle de recargas.
  }
}

/**
 * Cada despliegue cambia el nombre de los archivos JS. Una pestaña (o la PWA) abierta desde antes
 * sigue pidiendo los del despliegue anterior, que ya no existen: al abrir otra pantalla la descarga
 * falla. Con recargar se arregla, porque llega el HTML nuevo. Vite avisa con `vite:preloadError`;
 * si no se recarga, el error sigue su camino hasta ErrorBoundary.
 */
export function handleStaleChunk(event: Event, reload = () => window.location.reload()) {
  if (recentlyReloaded()) return
  sessionStorage.setItem(KEY, String(Date.now()))
  event.preventDefault()
  reload()
}

export function reloadOnStaleChunk() {
  window.addEventListener('vite:preloadError', (event) => handleStaleChunk(event))
}
