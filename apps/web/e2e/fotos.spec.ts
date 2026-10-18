import { expect, logIn, mockApi, test } from './fixtures'

test('una foto grande del móvil se reduce y se pasa a WebP antes de subirla', async ({ page }) => {
  // Generar y comprimir una foto de 12 megapíxeles lleva unos segundos en la máquina de la CI.
  test.setTimeout(60_000)
  await logIn(page)
  await mockApi(page, {
    'GET /me/inbox': () => ({ notifications: 0, messages: 0 }),
    'GET /me/pets': () => [
      {
        id: 'pet-1',
        name: 'Toby',
        species: 'dog',
        breed: null,
        sex: 'male',
        birthDate: null,
        color: null,
        description: null,
        photoUrl: null,
        createdAt: new Date().toISOString(),
        owner: { username: 'nabil', displayName: 'Nabil' },
      },
    ],
  })

  // Lo que llega a Supabase Storage.
  // supabase-js envía el archivo en un formulario multipart: se saca su tipo y sus bytes.
  const uploads: { type: string; body: Buffer }[] = []
  await page.route('http://supabase.test/storage/v1/object/media/**', (route) => {
    const request = route.request()
    const boundary = `--${request.headers()['content-type'].split('boundary=')[1]}`
    const raw = request.postDataBuffer()!
    const fileType = /Content-Type: (image\/[a-z]+)/.exec(raw.toString('latin1'))![1]
    const start = raw.indexOf(`Content-Type: ${fileType}`)
    const bodyStart = raw.indexOf('\r\n\r\n', start) + 4
    const bodyEnd = raw.indexOf(`\r\n${boundary}`, bodyStart)
    uploads.push({ type: fileType, body: raw.subarray(bodyStart, bodyEnd) })
    return route.fulfill({ json: { Key: 'media/x', Id: 'x' } })
  })

  await page.goto('/publicaciones/nueva')
  await expect(page.getByText('Toby')).toBeVisible()

  // Una "foto de móvil": 4000×3000 con degradados y algo de grano, en JPEG de calidad alta (unos MB).
  const photo = await page.evaluate(async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 4000
    canvas.height = 3000
    const ctx = canvas.getContext('2d')!
    const pixels = ctx.createImageData(4000, 3000)
    for (let i = 0; i < pixels.data.length; i++) {
      pixels.data[i] = i % 4 === 3 ? 255 : (128 + Math.sin(i / 997) * 60 + (i % 4) * 20 + Math.random() * 30) | 0
    }
    ctx.putImageData(pixels, 0, 0)
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.95))
    return [...new Uint8Array(await blob.arrayBuffer())]
  })
  const original = Buffer.from(photo)
  expect(original.length).toBeGreaterThan(2_000_000)

  await page.locator('input[type=file]').setInputFiles({ name: 'IMG_0001.jpg', mimeType: 'image/jpeg', buffer: original })
  await expect.poll(() => uploads.length, { timeout: 30_000 }).toBe(1)

  const [upload] = uploads
  expect(upload.type).toBe('image/webp')
  expect(upload.body.length).toBeLessThan(original.length / 3)
  const size = await page.evaluate(async (bytes) => {
    const bitmap = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: 'image/webp' }))
    return { width: bitmap.width, height: bitmap.height }
  }, [...upload.body])
  expect(size).toEqual({ width: 1600, height: 1200 })
})
