import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { expect, fullReport, logIn, mockApi, nearbyReports, test } from './fixtures'

/**
 * Accesibilidad de las pantallas principales con axe (las reglas de WCAG 2.1 AA que se pueden
 * comprobar automáticamente: contraste, nombres de botones y campos, jerarquía, idioma...).
 * No sustituye a probar con lector de pantalla, pero evita que se cuelen los errores más comunes.
 */
async function expectAccessible(page: Page) {
  // Esperar a que acabe de cargar y de animarse (el contraste de un fade-in a medias daría falsos errores).
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    // Las teselas y la atribución las pinta Leaflet/OpenStreetMap, no Furrly.
    .exclude('.leaflet-tile-pane')
    .exclude('.leaflet-control-attribution')
    .analyze()
  const summary = violations.map((v) => `${v.impact} · ${v.id}: ${v.help}\n    ${v.nodes.map((n) => n.target.join(' ')).slice(0, 5).join('\n    ')}`)
  expect(summary, summary.join('\n')).toEqual([])
}

const post = {
  id: 'p1',
  imageUrl: '/demo/luna-cachorra.jpg',
  caption: 'Primer paseo por el Retiro',
  createdAt: new Date().toISOString(),
  pet: { id: 'pet-1', name: 'Luna', species: 'dog', photoUrl: null, owner: { username: 'marta_v', displayName: 'Marta' } },
  likesCount: 3,
  commentsCount: 1,
  likedByMe: false,
}

const publicApi = {
  'GET /reports': () => nearbyReports,
  'GET /reports/:id': (_: unknown, { id }: Record<string, string>) => fullReport(id),
  'GET /reports/:id/sightings': () => [],
  'GET /posts': () => ({ posts: [post], nextCursor: null }),
}

const publicPages = ['/avisos', '/avisos/r-kiwi', '/comunidad', '/login', '/registro', '/buscar', '/privacidad']

for (const path of publicPages) {
  test(`accesible sin sesión: ${path}`, async ({ page }) => {
    await mockApi(page, publicApi)
    await page.goto(path)
    await expectAccessible(page)
  })
}

test('accesible con sesión: perfil', async ({ page }) => {
  await logIn(page)
  await mockApi(page, {
    'GET /me/inbox': () => ({ notifications: 0, messages: 0 }),
    'GET /me': () => ({ id: 'u1', username: 'nabil', usernameConfirmed: true, isAdmin: false, displayName: 'Nabil', avatarUrl: null, bio: null, alertRadiusKm: 5, alertLocation: null }),
    'GET /me/blocks': () => [],
  })
  await page.goto('/perfil')
  await expect(page.getByRole('heading', { name: 'Mi perfil' })).toBeVisible()
  await expectAccessible(page)
})
