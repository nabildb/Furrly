// Service worker de Furrly: recibe los avisos push y abre la página al tocarlos.
// No cachea nada (la app necesita la red para el mapa y los avisos); solo existe para el push
// y para que el navegador permita instalar la web como app.

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

// El contenido llega cifrado (RFC 8291) y el navegador ya nos lo da descifrado: { title, body, url, tag }.
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'Furrly', {
      body: data.body,
      icon: '/icons/icon-192.png',
      tag: data.tag,
      renotify: Boolean(data.tag),
      data: { url: data.url || '/avisos' },
    }),
  )
})

// Al tocar la notificación: si Furrly ya está abierta, se reutiliza esa pestaña; si no, se abre.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data.url, self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin)
      if (open) return open.navigate(url).then((w) => (w || open).focus())
      return self.clients.openWindow(url)
    }),
  )
})
