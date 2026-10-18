import { expect, mockApi, test } from './fixtures'

test('desde Comunidad se busca un perfil y se abre', async ({ page }) => {
  const queries: string[] = []
  await mockApi(page, {
    'GET /posts': () => ({ posts: [], nextCursor: null }),
    'GET /users': (request) => {
      queries.push(new URL(request.url()).searchParams.get('q')!)
      return [{ username: 'ana_g', displayName: 'Ana García', avatarUrl: null, petsCount: 2 }]
    },
    'GET /users/:username': () => ({
      username: 'ana_g',
      displayName: 'Ana García',
      avatarUrl: null,
      bio: null,
      createdAt: new Date().toISOString(),
      petsCount: 2,
      reportsCount: 0,
      blockedByMe: false,
    }),
    'GET /users/:username/pets': () => [],
  })

  await page.goto('/comunidad')
  await page.getByRole('link', { name: 'Buscar perfiles' }).click()
  await page.getByRole('searchbox', { name: 'Nombre o usuario' }).fill('@Ana')

  const result = page.getByRole('link', { name: /Ana García/ })
  await expect(result).toContainText('@ana_g · 2 mascotas')
  // Una sola petición aunque se escriba de golpe, y sin la @.
  expect(queries).toEqual(['Ana'])
  await result.click()
  await expect(page).toHaveURL(/\/u\/ana_g$/)
})
