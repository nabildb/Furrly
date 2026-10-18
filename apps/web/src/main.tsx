import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { AuthProvider } from './auth/AuthProvider'
import { InboxProvider } from './inbox/InboxProvider'
import { registerServiceWorker } from './lib/push'
// Fuentes servidas desde nuestro dominio (antes Google Fonts: dos dominios más y un CSS que bloqueaba el pintado).
import '@fontsource-variable/nunito-sans/opsz.css'
import '@fontsource-variable/unbounded/wght.css'
import './index.css'

registerServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <InboxProvider>
        <App />
      </InboxProvider>
    </AuthProvider>
  </StrictMode>,
)
