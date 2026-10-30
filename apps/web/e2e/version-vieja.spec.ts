import { expect, mockApi, test } from './fixtures'

test('si falta un archivo de la web, recarga una vez y luego ofrece una salida', async ({ page }) => {
  await mockApi(page, {})
  // Simula una pestaña de antes de un despliegue: el archivo de la página ya no existe.
  await page.route('**/assets/Login-*.js', (route) => route.fulfill({ status: 404, body: 'No existe' }))
  let loads = 0
  page.on('load', () => (loads += 1))

  await page.goto('/login')

  await expect(page.getByRole('alert')).toContainText('No hemos podido abrir esta pantalla')
  expect(loads).toBe(2)

  // Ya está disponible: recargar a mano la arregla.
  await page.unroute('**/assets/Login-*.js')
  await page.getByRole('button', { name: 'Recargar' }).click()
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByRole('alert')).toBeHidden()
})
