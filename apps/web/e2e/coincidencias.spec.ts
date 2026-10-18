import { expect, fullReport, mockApi, test } from './fixtures'

test('la ficha de un perdido enseña los encontrados que podrían ser él', async ({ page }) => {
  await mockApi(page, {
    'GET /reports/:id': (_, { id }) => fullReport(id),
    'GET /reports/:id/sightings': () => [],
    'GET /reports/:id/matches': () => [
      {
        id: 'r-encontrado',
        type: 'found',
        title: 'Periquito verde en un balcón',
        addressText: 'Calle Hortaleza',
        happenedAt: new Date(Date.now() - 3 * 3_600_000).toISOString(),
        distanceM: 640,
        photoUrl: null,
        petName: null,
      },
    ],
  })

  await page.goto('/avisos/r-kiwi')
  await expect(page.getByText('Puede que sea el mismo')).toBeVisible()
  const match = page.getByRole('link', { name: /Periquito verde en un balcón/ })
  await expect(match).toContainText('Encontrado a 640 m · hace 3 h')
  await expect(match).toHaveAttribute('href', '/avisos/r-encontrado')
})
