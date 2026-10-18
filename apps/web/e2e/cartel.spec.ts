import { expect, fullReport, logIn, mockApi, test } from './fixtures'

const report = (id: string) =>
  fullReport(id, {
    reporter: { username: 'nabil', displayName: 'Nabil' },
    contact: { phone: '600 123 456', email: 'nabil@example.com' },
  })

test('el dueño imprime un cartel con su teléfono y un QR que lleva al aviso', async ({ page }) => {
  await logIn(page, 'nabil')
  await mockApi(page, {
    'GET /me/inbox': () => ({ notifications: 0, messages: 0 }),
    'GET /reports/:id': (_, { id }) => report(id),
    'GET /reports/:id/sightings': () => [],
  })

  await page.goto('/avisos/r-kiwi')
  await page.getByRole('link', { name: 'Ver cartel' }).click()
  await expect(page).toHaveURL(/\/avisos\/r-kiwi\/cartel$/)

  await expect(page.getByText('SE BUSCA')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Kiwi' })).toBeVisible()
  await expect(page.getByText('☎ 600 123 456')).toBeVisible()
  const qr = page.getByRole('img', { name: 'Código QR del aviso' })
  await expect(qr).toHaveAttribute('src', /^data:image\/png;base64,/)
  // La navegación no sale en el cartel.
  await expect(page.getByRole('navigation')).toHaveCount(0)
})

test('si lo imprime otra persona, el cartel no lleva los datos de contacto', async ({ page }) => {
  await logIn(page, 'vecina')
  await mockApi(page, {
    'GET /me/inbox': () => ({ notifications: 0, messages: 0 }),
    'GET /reports/:id': (_, { id }) => report(id),
  })

  await page.goto('/avisos/r-kiwi/cartel')
  await expect(page.getByText('SE BUSCA')).toBeVisible()
  await expect(page.getByText('600 123 456')).toHaveCount(0)
  await expect(page.getByText('nabil@example.com')).toHaveCount(0)
})
