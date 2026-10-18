/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string
  readonly VITE_API_URL?: string
  /** Sentry: errores de JavaScript de los usuarios. Sin ella no se envía nada. */
  readonly VITE_SENTRY_DSN?: string
}
