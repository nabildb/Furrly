const dsn = import.meta.env.VITE_SENTRY_DSN

/** Quita la query de una URL (?q=… de Buscar perfiles, tokens de login...): no debe salir de la web. */
const withoutQuery = (url?: string) => url?.split('?')[0].split('#')[0]

let sentry: Promise<typeof import('@sentry/react')> | null = null

function onError(e: ErrorEvent) {
  reportError(e.error ?? e.message)
}

function onRejection(e: PromiseRejectionEvent) {
  reportError(e.reason)
}

function loadSentry() {
  sentry ??= import('@sentry/react').then((Sentry) => {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      // Sentry 11 lo recoge todo por defecto: aquí se apaga todo lo que pueda llevar datos de usuarios.
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: false,
        httpBodies: [],
        urlQueryParams: false,
        databaseQueryData: false,
        stackFrameVariables: false,
      },
      // Solo errores: nada de trazas de rendimiento ni grabación de sesiones.
      tracesSampleRate: 0,
      beforeSend(event) {
        delete event.user
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
    // Desde aquí los captura el propio Sentry: se quitan los avisadores.
    window.removeEventListener('error', onError)
    window.removeEventListener('unhandledrejection', onRejection)
    return Sentry
  })
  return sentry
}

/**
 * Sentry recoge los errores de JavaScript que les pasan a los usuarios. Solo si hay DSN (en local y
 * en los tests no hay). Su SDK pesa ~150 kB y casi nadie llega a necesitarlo, así que no se descarga
 * al entrar, sino con el primer error. A cambio el informe no trae el rastro de lo que se hizo antes
 * del fallo (breadcrumbs): el error y su traza sí.
 */
export function initSentry() {
  if (!dsn) return
  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onRejection)
}

/** Envía un error a Sentry. También para los que React captura al pintar (no llegan a window.onerror). */
export function reportError(error: unknown) {
  if (!dsn) return
  // Si no se puede descargar (sin conexión), ese error se pierde: aquí no debe nacer otro.
  loadSentry()
    .then((Sentry) => Sentry.captureException(error))
    .catch(() => {})
}
