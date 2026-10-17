import { test as base, type Page, type Request } from '@playwright/test'

type Handler = (request: Request, params: Record<string, string>) => unknown

/**
 * Simula la API: cada clave es "MÉTODO /ruta" (con :parámetros) y devuelve el JSON de respuesta.
 * Lo que no esté definido responde 404, así un test falla si la web pide algo inesperado.
 */
export async function mockApi(page: Page, routes: Record<string, Handler>) {
  const compiled = Object.entries(routes).map(([key, handler]) => {
    const [method, path] = key.split(' ')
    const names: string[] = []
    const regex = new RegExp(`^${path.replace(/:(\w+)/g, (_, name) => (names.push(name), '([^/]+)'))}$`)
    return { method, regex, names, handler }
  })

  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace(/^\/api/, '')
    for (const r of compiled) {
      const match = r.method === request.method() && r.regex.exec(path)
      if (!match) continue
      const params = Object.fromEntries(r.names.map((n, i) => [n, match[i + 1]]))
      const body = await r.handler(request, params)
      return route.fulfill({ status: request.method() === 'POST' ? 201 : 200, json: body ?? {} })
    }
    return route.fulfill({ status: 404, json: { error: `Sin simular: ${request.method()} ${path}` } })
  })
}

/** Sesión de Supabase falsa en localStorage (la web solo la lee; nunca habla con Supabase en los tests). */
export async function logIn(page: Page, username = 'nabil') {
  const session = {
    access_token: 'token-de-prueba',
    refresh_token: 'refresco-de-prueba',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: {
      id: '00000000-0000-4000-8000-000000000001',
      aud: 'authenticated',
      role: 'authenticated',
      email: `${username}@example.com`,
      user_metadata: { username, display_name: 'Nabil' },
      app_metadata: {},
      created_at: new Date().toISOString(),
    },
  }
  // La clave la forma supabase-js con el subdominio de VITE_SUPABASE_URL (http://supabase.test).
  await page.addInitScript((value) => localStorage.setItem('sb-supabase-auth-token', value), JSON.stringify(session))
}

/** Sin red externa: ni teselas del mapa, ni fuentes, ni Supabase. */
export const test = base.extend({
  // El segundo parámetro de una fixture se suele llamar "use"; aquí "run" para no confundir al linter de React.
  page: async ({ page }, run) => {
    await page.route(/tile\.openstreetmap\.org|fonts\.(googleapis|gstatic)\.com|supabase\.test/, (route) => route.abort())
    await run(page)
  },
})

export { expect } from '@playwright/test'

/** Datos de ejemplo. */
export const nearbyReports = [
  {
    id: 'r-kiwi',
    type: 'lost',
    species: 'bird',
    title: 'Se ha escapado Kiwi, periquito verde',
    addressText: 'Plaza de Chueca',
    happenedAt: new Date(Date.now() - 30 * 60_000).toISOString(),
    location: { lat: 40.4228, lng: -3.6973 },
    distanceM: 870,
    photoUrl: null,
    petName: 'Kiwi',
  },
  {
    id: 'r-perro',
    type: 'found',
    species: 'dog',
    title: 'Perro pequeño blanco encontrado en Lavapiés',
    addressText: 'Plaza de Lavapiés',
    happenedAt: new Date(Date.now() - 2 * 3_600_000).toISOString(),
    location: { lat: 40.4086, lng: -3.7008 },
    distanceM: 950,
    photoUrl: null,
    petName: null,
  },
]

export function fullReport(id: string, overrides: Record<string, unknown> = {}) {
  const nearby = nearbyReports.find((r) => r.id === id) ?? nearbyReports[0]
  return {
    id,
    type: nearby.type,
    status: 'active',
    species: nearby.species,
    title: nearby.title,
    description: 'Periquito verde y amarillo. Se escapó por el balcón.',
    addressText: nearby.addressText,
    happenedAt: nearby.happenedAt,
    resolvedAt: null,
    createdAt: nearby.happenedAt,
    reporter: { username: 'ana_g', displayName: 'Ana García' },
    pet: nearby.petName ? { id: 'pet-1', name: nearby.petName, breed: null, photoUrl: null } : null,
    photos: [],
    location: nearby.location,
    hasContact: true,
    contact: null,
    ...overrides,
  }
}
