import { expect, logIn, mockApi, test } from './fixtures'

test('con Google activado en Supabase, el botón lleva a Google y vuelve a la página de antes', async ({ page }) => {
  // Ajustes públicos de Supabase Auth: Google activado, Apple no.
  await page.route('http://supabase.test/auth/v1/settings', (route) =>
    route.fulfill({ json: { external: { google: true, apple: false, email: true } } }),
  )
  await page.route('http://supabase.test/auth/v1/authorize**', (route) => route.abort())

  await page.goto('/login')
  await expect(page.getByRole('button', { name: 'Continuar con Apple' })).toHaveCount(0)

  const authorize = page.waitForRequest('http://supabase.test/auth/v1/authorize**')
  await page.getByRole('button', { name: 'Continuar con Google' }).click()
  const url = new URL((await authorize).url())
  expect(url.searchParams.get('provider')).toBe('google')
  expect(url.searchParams.get('redirect_to')).toMatch(/\/login\?next=%2Favisos$/)
})

test('sin proveedores activados no se muestra ningún botón', async ({ page }) => {
  await page.goto('/registro')
  await expect(page.getByRole('heading', { name: 'Crear cuenta' })).toBeVisible()
  await expect(page.getByText('o con tu email')).toHaveCount(0)
})

test('la primera vez con Google se elige el nombre de usuario y se sigue donde iba', async ({ page }) => {
  await logIn(page)
  let me = { id: 'u1', username: 'nabildaiday1', usernameConfirmed: false, displayName: 'Nabil Daiday', avatarUrl: null, bio: null, alertRadiusKm: 5, alertLocation: null }
  let sent: unknown = null
  await mockApi(page, {
    'GET /me': () => me,
    'GET /me/inbox': () => ({ notifications: 0, messages: 0 }),
    'GET /notifications': () => ({ notifications: [], nextCursor: null }),
    'PUT /me/username': (request) => {
      sent = request.postDataJSON()
      me = { ...me, username: 'nabil_d', usernameConfirmed: true }
      return me
    },
  })

  await page.goto('/notificaciones')
  await expect(page).toHaveURL(/\/bienvenida\?next=%2Fnotificaciones$/)
  const username = page.getByRole('textbox', { name: 'Nombre de usuario' })
  await expect(username).toHaveValue('nabildaiday1')

  await username.fill('nabil_d')
  await page.getByRole('button', { name: 'Empezar' }).click()
  await expect(page).toHaveURL(/\/notificaciones$/)
  expect(sent).toEqual({ username: 'nabil_d', displayName: 'Nabil Daiday' })
})
