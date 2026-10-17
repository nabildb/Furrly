import { expect, fullReport, logIn, mockApi, nearbyReports, test } from './fixtures'

test('un invitado ve los avisos cerca y abre uno', async ({ page }) => {
  await mockApi(page, {
    'GET /reports': () => nearbyReports,
    'GET /reports/:id': (_, { id }) => fullReport(id),
    'GET /reports/:id/sightings': () => [],
  })
  await page.goto('/')

  // La portada es el mapa, con las tarjetas de los avisos (carrusel en móvil, lista en escritorio).
  await expect(page).toHaveURL(/\/avisos$/)
  const card = page.getByRole('link', { name: /Kiwi/ })
  await expect(card).toBeVisible()
  await expect(page.getByRole('link', { name: /Perro pequeño blanco/ })).toBeVisible()

  await card.click()
  await expect(page.getByRole('heading', { name: 'Se ha escapado Kiwi, periquito verde' })).toBeVisible()
  // Sin sesión, el contacto no se enseña: se invita a entrar.
  await expect(page.getByText('Ha dejado teléfono o email: entra para verlo.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Entra para escribirle' })).toBeVisible()
})

test('publicar un aviso de animal encontrado con el asistente', async ({ page }) => {
  await logIn(page)
  let published: Record<string, unknown> | null = null
  await mockApi(page, {
    'GET /me/inbox': () => ({ notifications: 0, messages: 0 }),
    'GET /me/pets': () => [],
    'GET /me/reports': () => [],
    'POST /reports': (request) => {
      published = request.postDataJSON()
      return { id: 'r-nuevo' }
    },
    'GET /reports/:id': (_, { id }) =>
      fullReport(id, { type: 'found', species: 'cat', title: published?.title, reporter: { username: 'nabil', displayName: 'Nabil' } }),
    'GET /reports/:id/sightings': () => [],
  })
  await page.goto('/avisos/nuevo')

  await page.getByText('He encontrado un animal').click()
  await page.getByText('Gato', { exact: true }).click()
  await page.getByRole('button', { name: /^Siguiente/ }).click()

  // Paso 2: marcar el lugar tocando el mapa (Leaflet de verdad, sin teselas).
  await expect(page.getByRole('heading', { name: '¿Dónde y cuándo?' })).toBeVisible()
  await page.locator('.leaflet-container').click({ position: { x: 120, y: 160 } })
  await expect(page.getByText('Punto marcado.')).toBeVisible()
  await page.getByRole('textbox', { name: /Zona o dirección/ }).fill('Lavapiés')
  await page.getByRole('button', { name: /^Siguiente/ }).click()

  // Paso 3: el título viene propuesto.
  await expect(page.getByRole('textbox', { name: 'Título' })).toHaveValue('Gato encontrado en Lavapiés')
  await page.getByRole('textbox', { name: /^Descripción/ }).fill('Gata tricolor muy cariñosa, sin collar.')
  await page.getByRole('button', { name: 'Publicar aviso' }).click()

  await expect(page).toHaveURL(/\/avisos\/r-nuevo$/)
  await expect(page.getByRole('heading', { name: 'Gato encontrado en Lavapiés' })).toBeVisible()
  expect(published).toMatchObject({ type: 'found', species: 'cat', addressText: 'Lavapiés', photoUrls: [] })
})
