const dsn = import.meta.env.VITE_SENTRY_DSN

/** Quita la query de una URL (?q=… de Buscar perfiles, tokens de login...): no debe salir de la web. */
const withoutQuery = (url?: string) => url?.split('?')[0].split('#')[0]

let sentry: Promise<typeof import('@sentry/react')> | null = null

/** Cuando la página ha terminado de cargar y el navegador está libre. */
function whenIdle() {
  return new Promise<void>((resolve) => {
    const idle = () =>
      'requestIdleCallback' in window ? requestIdleCallback(() => resolve(), { timeout: 5000 }) : setTimeout(resolve, 2000)
    if (document.readyState === 'complete') idle()
    else window.addEventListener('load', idle, { once: true })
  })
}

/**
 * Sentry recoge los errores de JavaScript que les pasan a los usuarios. Solo si hay DSN (en local y
 * en los tests no hay). Su SDK pesa ~150 kB: si se pidiera al arrancar competiría con la página y las
 * teselas del mapa en un móvil lento, así que se descarga cuando la página ya ha cargado. Los errores
 * de antes se guardan y se envían en cuanto está listo.
 */
export function initSentry() {
  if (!dsn || sentry) return
  const early: unknown[] = []
  const onError = (e: ErrorEvent) => early.push(e.error ?? e.message)
  const onRejection = (e: PromiseRejectionEvent) => early.push(e.reason)
  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onRejection)

  sentry = whenIdle().then(() => import('@sentry/react')).then((Sentry) => {
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
    // Desde aquí los captura el propio Sentry: se envían los de antes y se quitan los avisadores.
    window.removeEventListener('error', onError)
    window.removeEventListener('unhandledrejection', onRejection)
    for (const error of early) Sentry.captureException(error)
    return Sentry
  })
}

/** Para los errores que React captura al pintar (no llegan a window.onerror). */
export function reportError(error: unknown) {
  void sentry?.then((Sentry) => Sentry.captureException(error))
}
