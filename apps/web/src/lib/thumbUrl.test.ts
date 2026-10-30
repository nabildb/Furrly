import { describe, expect, it } from 'vitest'
import { thumbUrl } from './thumbUrl'

const media = 'https://x.supabase.co/storage/v1/object/public/media/u1/pets'

describe('thumbUrl', () => {
  it('apunta a la miniatura de las fotos que la tienen', () => {
    expect(thumbUrl(`${media}/abc-t.webp`)).toBe(`${media}/abc-thumb.webp`)
    expect(thumbUrl(`${media}/abc-t.jpeg`)).toBe(`${media}/abc-thumb.jpeg`)
  })

  it('apunta a la miniatura de las fotos de demo', () => {
    expect(thumbUrl('https://furrly.app/demo/toby.jpg')).toBe('https://furrly.app/demo/thumbs/toby.jpg')
    expect(thumbUrl('/demo/toby.jpg')).toBe('/demo/thumbs/toby.jpg')
  })

  it('deja igual las fotos sin miniatura', () => {
    expect(thumbUrl(`${media}/4f1c-8a2e.webp`)).toBe(`${media}/4f1c-8a2e.webp`)
    expect(thumbUrl('https://otra-web.test/foto.png')).toBe('https://otra-web.test/foto.png')
  })
})
