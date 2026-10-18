import { expect, logIn, mockApi, test } from './fixtures'

// La confirmación vive dentro de la página de perfil (que tiene su propio formulario): se prueba ahí,
// como la usa la gente, no el componente suelto.
test('borrar la cuenta desde el perfil, escribiendo el usuario como lo pone el teclado del móvil', async ({ page }) => {
  await logIn(page, 'nabil2')
  let deleted = false
  let profileSaved = false
  await mockApi(page, {
    'GET /me/inbox': () => ({ notifications: 0, messages: 0 }),
    'GET /me': () => ({ id: 'u2', username: 'nabil2', usernameConfirmed: true, onboardingDone: true, isAdmin: false, displayName: 'Nabil', avatarUrl: null, bio: null, alertRadiusKm: 5, alertLocation: null }),
    'GET /me/blocks': () => [],
    'PATCH /me': () => {
      profileSaved = true
      return {}
    },
    'DELETE /me': () => {
      deleted = true
      return {}
    },
  })
  // Storage: la carpeta del usuario está vacía.
  await page.route('http://supabase.test/storage/v1/object/list/**', (route) => route.fulfill({ json: [] }))
  await page.route('http://supabase.test/auth/v1/logout**', (route) => route.fulfill({ status: 204 }))

  await page.goto('/perfil')
  await page.getByRole('button', { name: /Borrar mi cuenta/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Borrar mi cuenta' })
  await dialog.getByRole('textbox', { name: 'Nombre de usuario' }).fill('Nabil2 ')
  await dialog.getByRole('button', { name: 'Borrar definitivamente' }).click()

  await expect.poll(() => deleted).toBe(true)
  await expect(page).toHaveURL(/\/avisos$/)
  // Confirmar el borrado no debe guardar de paso el formulario del perfil.
  expect(profileSaved).toBe(false)
})
