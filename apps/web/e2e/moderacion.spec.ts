import { expect, logIn, mockApi, test } from './fixtures'

const me = (isAdmin: boolean) => () => ({
  id: 'u1',
  username: 'nabil',
  usernameConfirmed: true,
  onboardingDone: true,
  isAdmin,
  displayName: 'Nabil',
  avatarUrl: null,
  bio: null,
  alertRadiusKm: 5,
  alertLocation: null,
})

const post = (id: string, caption: string) => ({
  id,
  imageUrl: '/demo/toby.jpg',
  caption,
  createdAt: new Date().toISOString(),
  pet: { id: 'pet1', name: 'Toby', species: 'dog', photoUrl: null, owner: { username: 'vecina', displayName: 'Vecina' } },
  likesCount: 0,
  commentsCount: 0,
  likedByMe: false,
})

const profile = {
  username: 'troll',
  displayName: 'Troll',
  avatarUrl: null,
  bio: null,
  createdAt: new Date().toISOString(),
  petsCount: 0,
  reportsCount: 0,
  blockedByMe: false,
}

test('un moderador borra una publicación desde la comunidad, sin denuncia', async ({ page }) => {
  await logIn(page)
  const deleted: string[] = []
  await mockApi(page, {
    'GET /me/inbox': () => ({ notifications: 0, messages: 0 }),
    'GET /me': me(true),
    'GET /feed': () => ({ posts: [post('p1', 'Compra seguidores aquí'), post('p2', 'Toby en el parque')], nextCursor: null }),
    'DELETE /admin/content/post/:id': (_request, { id }) => {
      deleted.push(id)
    },
  })

  await page.goto('/comunidad')
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('article').filter({ hasText: 'Compra seguidores aquí' }).getByRole('button', { name: 'Borrar publicación' }).click()

  await expect(page.getByText('Compra seguidores aquí')).toBeHidden()
  await expect(page.getByText('Toby en el parque')).toBeVisible()
  expect(deleted).toEqual(['p1'])
})

test('un moderador suspende una cuenta desde su perfil y puede readmitirla', async ({ page }) => {
  await logIn(page)
  let suspended = false
  await mockApi(page, {
    'GET /me/inbox': () => ({ notifications: 0, messages: 0 }),
    'GET /me': me(true),
    'GET /users/troll': () => profile,
    'GET /users/troll/pets': () => [],
    'GET /admin/suspended': () => (suspended ? [{ username: 'troll', displayName: 'Troll', suspendedAt: new Date().toISOString() }] : []),
    'PUT /admin/suspended/troll': () => {
      suspended = true
    },
    'DELETE /admin/suspended/troll': () => {
      suspended = false
    },
  })

  await page.goto('/u/troll')
  page.on('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Suspender cuenta' }).click()
  await page.getByRole('button', { name: 'Levantar suspensión' }).click()

  await expect(page.getByRole('button', { name: 'Suspender cuenta' })).toBeVisible()
  expect(suspended).toBe(false)
})

test('quien no es moderador no ve los botones de moderación', async ({ page }) => {
  await logIn(page)
  await mockApi(page, {
    'GET /me/inbox': () => ({ notifications: 0, messages: 0 }),
    'GET /me': me(false),
    'GET /feed': () => ({ posts: [post('p1', 'Toby en el parque')], nextCursor: null }),
    'GET /users/troll': () => profile,
    'GET /users/troll/pets': () => [],
  })

  await page.goto('/comunidad')
  await expect(page.getByText('Toby en el parque')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Borrar publicación' })).toHaveCount(0)

  await page.goto('/u/troll')
  await expect(page.getByRole('button', { name: 'Denunciar perfil' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Suspender cuenta' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Borrar perfil' })).toHaveCount(0)
})

test('un moderador borra un perfil escribiendo su nombre', async ({ page }) => {
  await logIn(page)
  let deleted = false
  await mockApi(page, {
    'GET /me/inbox': () => ({ notifications: 0, messages: 0 }),
    'GET /me': me(true),
    'GET /users/troll': () => profile,
    'GET /users/troll/pets': () => [],
    'GET /admin/suspended': () => [],
    'DELETE /admin/users/troll': () => {
      deleted = true
    },
    'GET /feed': () => ({ posts: [], nextCursor: null }),
  })

  await page.goto('/u/troll')
  await page.getByRole('button', { name: 'Borrar perfil' }).click()
  const dialog = page.getByRole('dialog', { name: 'Borrar a @troll' })
  await expect(dialog.getByRole('button', { name: 'Borrar definitivamente' })).toBeDisabled()
  await dialog.getByRole('textbox', { name: 'Nombre de usuario' }).fill('Troll ')
  await dialog.getByRole('button', { name: 'Borrar definitivamente' }).click()

  await expect(page).toHaveURL(/\/comunidad$/)
  expect(deleted).toBe(true)
})

test('un moderador borra una mascota desde su ficha', async ({ page }) => {
  await logIn(page)
  let deleted = false
  const pet = {
    id: 'pet1',
    name: 'Toby',
    species: 'dog',
    breed: null,
    sex: 'unknown',
    birthDate: null,
    color: null,
    description: null,
    photoUrl: null,
    createdAt: new Date().toISOString(),
    owner: { username: 'troll', displayName: 'Troll' },
    followersCount: 0,
    postsCount: 0,
    followedByMe: false,
  }
  await mockApi(page, {
    'GET /me/inbox': () => ({ notifications: 0, messages: 0 }),
    'GET /me': me(true),
    'GET /pets/pet1': () => pet,
    'GET /pets/pet1/posts': () => ({ posts: [], nextCursor: null }),
    'DELETE /admin/content/pet/pet1': () => {
      deleted = true
    },
    'GET /users/troll': () => profile,
    'GET /users/troll/pets': () => [],
    'GET /admin/suspended': () => [],
  })

  await page.goto('/mascotas/pet1')
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Borrar a Toby' }).click()

  await expect(page).toHaveURL(/\/u\/troll$/)
  expect(deleted).toBe(true)
})

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
