import { expect, logIn, mockApi, test } from './fixtures'

test('un moderador revisa una denuncia y borra la publicación', async ({ page }) => {
  await logIn(page)
  let resolved: unknown = null
  const item = {
    targetType: 'post',
    targetId: 'p1',
    count: 2,
    lastFlaggedAt: new Date().toISOString(),
    resolvedAt: null,
    flags: [
      { reason: 'spam', details: 'Vende cosas', by: 'vecina', createdAt: new Date().toISOString() },
      { reason: 'inappropriate', details: null, by: 'vecino', createdAt: new Date().toISOString() },
    ],
    target: {
      title: 'Publicación de Toby',
      text: 'Compra seguidores aquí',
      url: '/publicaciones/p1',
      author: { username: 'spammer', displayName: 'Spammer', suspendedAt: null },
    },
  }
  await mockApi(page, {
    'GET /me/inbox': () => ({ notifications: 0, messages: 0 }),
    'GET /me': () => ({ id: 'u1', username: 'nabil', usernameConfirmed: true, isAdmin: true, displayName: 'Nabil', avatarUrl: null, bio: null, alertRadiusKm: 5, alertLocation: null }),
    'GET /admin/flags': () => (resolved ? [] : [item]),
    'GET /admin/suspended': () => [],
    'POST /admin/flags/resolve': (request) => {
      resolved = request.postDataJSON()
      return { ok: true }
    },
  })

  await page.goto('/moderacion')
  await expect(page.getByText('Compra seguidores aquí')).toBeVisible()
  await expect(page.getByText('2 denuncias')).toBeVisible()
  await expect(page.getByText('“Vende cosas”')).toBeVisible()

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Borrar' }).click()
  await expect(page.getByText('No hay nada pendiente de revisar.')).toBeVisible()
  expect(resolved).toEqual({ targetType: 'post', targetId: 'p1', action: 'remove' })
})
