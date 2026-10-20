import { Analytics } from '@vercel/analytics/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { AuthProvider } from './auth/AuthProvider'
import { MeProvider } from './auth/MeProvider'
import { InboxProvider } from './inbox/InboxProvider'
import { registerServiceWorker } from './lib/push'
import { initSentry, reportError } from './lib/sentry'
// Fuentes servidas desde nuestro dominio (antes Google Fonts: dos dominios más y un CSS que bloqueaba el pintado).
// De Nunito Sans solo el eje de grosor (wght): con el de tamaño óptico (opsz) pesaba 50 kB en vez de 31 kB.
import '@fontsource-variable/nunito-sans/wght.css'
import '@fontsource-variable/unbounded/wght.css'
import './index.css'

registerServiceWorker()
initSentry()

createRoot(document.getElementById('root')!, {
  // Errores al pintar que React no puede recuperar: también a Sentry.
  onUncaughtError: (error, info) => {
    reportError(error)
    console.error(error, info.componentStack)
  },
}).render(
  <StrictMode>
    <AuthProvider>
      <MeProvider>
        <InboxProvider>
          <App />
          {/* Vercel Web Analytics: sin cookies. Se quita la query (?q=… en Buscar perfiles) para no enviar lo que busca la gente. */}
          <Analytics beforeSend={(event) => ({ ...event, url: event.url.split('?')[0] })} />
        </InboxProvider>
      </MeProvider>
    </AuthProvider>
  </StrictMode>,
)
