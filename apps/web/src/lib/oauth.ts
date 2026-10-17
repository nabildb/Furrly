import { supabase } from './supabase'

export type OAuthProvider = 'google' | 'apple'
const PROVIDERS: OAuthProvider[] = ['google', 'apple']

let enabled: Promise<OAuthProvider[]> | null = null

/**
 * Proveedores activados en Supabase Auth. Se leen de su endpoint público de ajustes, así el botón
 * aparece solo cuando el proveedor está configurado (y Apple no sale hasta que lo esté).
 */
export function enabledProviders() {
  enabled ??= fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/settings`, {
    headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
  })
    .then((res) => (res.ok ? res.json() : { external: {} }))
    .then((settings: { external?: Record<string, boolean> }) => PROVIDERS.filter((p) => settings.external?.[p]))
    .catch(() => [])
  return enabled
}

/** Va a Google/Apple y, al volver, al login con la sesión ya iniciada, que lleva a `next`. */
export async function signInWith(provider: OAuthProvider, next: string) {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}/login?next=${encodeURIComponent(next)}` },
  })
  if (error) throw error
}
