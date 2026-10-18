import { expect, logIn, mockApi, test } from './fixtures'

test('una cuenta nueva pasa por la guía: marca su zona y sigue donde iba', async ({ page }) => {
  await logIn(page)
  let me = { id: 'u1', username: 'nabil', usernameConfirmed: true, onboardingDone: false, isAdmin: false, displayName: 'Nabil', avatarUrl: null, bio: null, alertRadiusKm: 5, alertLocation: null as unknown }
  let zone: Record<string, unknown> | null = null
  await mockApi(page, {
    'GET /me': () => me,
    'GET /me/inbox': () => ({ notifications: 0, messages: 0 }),
    'GET /notifications': () => ({ notifications: [], nextCursor: null }),
    'PATCH /me': (request) => {
      zone = request.postDataJSON()
      me = { ...me, ...zone }
      return me
    },
    'PUT /me/onboarding': () => {
      me = { ...me, onboardingDone: true }
      return me
    },
  })

  await page.goto('/notificaciones')
  await expect(page).toHaveURL(/\/empezar\?next=%2Fnotificaciones$/)
  await expect(page.getByRole('heading', { name: '¿Dónde vives?' })).toBeVisible()

  // Marcar la zona tocando el mapa y elegir 2 km.
  await page.locator('.leaflet-container').click({ position: { x: 150, y: 120 } })
  await page.getByRole('button', { name: '2 km' }).click()
  await page.getByRole('button', { name: 'Guardar y seguir' }).click()
  expect(zone).toMatchObject({ alertRadiusKm: 2, alertLocation: { lat: expect.any(Number), lng: expect.any(Number) } })

  await expect(page.getByRole('heading', { name: 'Que no se te escape ningún aviso' })).toBeVisible()
  await page.getByRole('button', { name: 'Seguir' }).click()
  await page.getByRole('button', { name: 'Ahora no, ir a Furrly' }).click()
  await expect(page).toHaveURL(/\/notificaciones$/)
})

test('quien ya pasó por la guía no la vuelve a ver', async ({ page }) => {
  await logIn(page)
  await mockApi(page, {
    'GET /me': () => ({ id: 'u1', username: 'nabil', usernameConfirmed: true, onboardingDone: true }),
    'GET /me/inbox': () => ({ notifications: 0, messages: 0 }),
    'GET /notifications': () => ({ notifications: [], nextCursor: null }),
  })
  await page.goto('/notificaciones')
  await expect(page.getByRole('heading', { name: 'Notificaciones' })).toBeVisible()
  await expect(page).toHaveURL(/\/notificaciones$/)
})
