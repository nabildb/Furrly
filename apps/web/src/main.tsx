import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { AuthProvider } from './auth/AuthProvider'
import { InboxProvider } from './inbox/InboxProvider'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <InboxProvider>
        <App />
      </InboxProvider>
    </AuthProvider>
  </StrictMode>,
)
