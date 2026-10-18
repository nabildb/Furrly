// Capturas del README, hechas contra la web de producción con un Chromium real.
// Se lanzan desde GitHub Actions (workflow «Capturas»); el resultado se descarga y se copia a docs/capturas.
import { mkdir } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const SITE = 'https://furrly-rouge.vercel.app'
// Avisos de la demo (UUIDs fijos, ver apps/api/src/scripts/seed-demo.ts).
const ROCKY = 'f0f0f0f0-0000-4000-8000-000000000024'
const KIWI = 'f0f0f0f0-0000-4000-8000-000000000025'
const OUT = 'capturas'

const browser = await chromium.launch()
await mkdir(OUT, { recursive: true })

async function shoot(name, path, { viewport = { width: 390, height: 844 }, mobile = true, before, element } = {}) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile, locale: 'es-ES' })
  await page.goto(SITE + path, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500) // teselas del mapa y animaciones
  if (before) await before(page)
  const target = element ? page.locator(element) : page
  await target.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 82 })
  console.log(`✓ ${name}`)
  await page.close()
}

await shoot('mapa', '/avisos')
await shoot('ficha', `/avisos/${ROCKY}`)
await shoot('comunidad', '/comunidad')
await shoot('coincidencias', `/avisos/${ROCKY}`, {
  before: async (page) => {
    // Centrar el apartado (scrollIntoViewIfNeeded no baja si ya asoma un poco).
    await page.getByText('Puede que sea el mismo').evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await page.waitForTimeout(800)
  },
})
await shoot('cartel', `/avisos/${KIWI}/cartel`, { viewport: { width: 900, height: 1300 }, mobile: false, element: 'article' })
await shoot('escritorio', '/avisos', { viewport: { width: 1440, height: 900 }, mobile: false })

await browser.close()
