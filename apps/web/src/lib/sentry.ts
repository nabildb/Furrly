const dsn = import.meta.env.VITE_SENTRY_DSN

/** Quita la query de una URL (?q=… de Buscar perfiles, tokens de login...): no debe salir de la web. */
const withoutQuery = (url?: string) => url?.split('?')[0].split('#')[0]

let sentry: Promise<typeof import('@sentry/react')> | null = null

/**
 * Sentry recoge los errores de JavaScript que les pasan a los usuarios. Se carga en segundo plano
 * y solo si hay DSN (en local y en los tests no hay), para no añadir peso a la carga inicial.
 */
export function initSentry() {
  if (!dsn || sentry) return
  sentry = import('@sentry/react').then((Sentry) => {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      sendDefaultPii: false,
      // Solo errores: nada de trazas de rendimiento ni grabación de sesiones.
      tracesSampleRate: 0,
      beforeSend(event) {
        if (event.request) event.request.url = withoutQuery(event.request.url)
        return event
      },
      beforeBreadcrumb(breadcrumb) {
        if (breadcrumb.data?.url) breadcrumb.data.url = withoutQuery(breadcrumb.data.url)
        if (breadcrumb.data?.to) breadcrumb.data.to = withoutQuery(breadcrumb.data.to)
        if (breadcrumb.data?.from) breadcrumb.data.from = withoutQuery(breadcrumb.data.from)
        return breadcrumb
      },
    })
    return Sentry
  })
}

/** Para los errores que React captura al pintar (no llegan a window.onerror). */
export function reportError(error: unknown) {
  void sentry?.then((Sentry) => Sentry.captureException(error))
}
