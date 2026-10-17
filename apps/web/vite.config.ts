import { readFileSync } from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

interface VercelHeaders {
  headers?: { source: string; headers: { key: string; value: string }[] }[]
}

const PRODUCTION_SUPABASE = 'https://dgaiisrusilbieffjcdh.supabase.co'

/**
 * Cabeceras de seguridad de la web (CSP, nosniff...). Se definen una sola vez en vercel.json y el
 * servidor de preview las aplica también: así los tests end-to-end se ejecutan con la CSP activa
 * y, si algo la incumple, la CI falla. (En `npm run dev` no: Vite inyecta scripts para recargar.)
 */
function securityHeaders() {
  const vercel = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8')) as VercelHeaders
  const web = vercel.headers?.find((h) => h.source === '/((?!api/).*)')
  // Si la web apunta a otro Supabase (el falso de los tests e2e), la CSP lo permite a él en vez del de producción.
  const supabase = process.env.VITE_SUPABASE_URL ? new URL(process.env.VITE_SUPABASE_URL).origin : null
  return Object.fromEntries(
    (web?.headers ?? []).map((h) => [h.key, supabase ? h.value.replaceAll(PRODUCTION_SUPABASE, supabase) : h.value]),
  )
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  preview: {
    headers: securityHeaders(),
    // En local, `vite preview` sirve la web compilada; /api se reenvía a la API de desarrollo.
    proxy: { '/api': { target: 'http://localhost:3000', rewrite: (path) => path.replace(/^\/api/, '') } },
  },
})
