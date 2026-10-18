import { describe, expect, it } from 'vitest'
import { compressImage, fitInside } from './compressImage'

describe('comprimir fotos', () => {
  it('reduce el lado mayor sin deformar ni ampliar', () => {
    expect(fitInside(4032, 3024, 1600)).toEqual({ width: 1600, height: 1200 })
    expect(fitInside(3024, 4032, 1600)).toEqual({ width: 1200, height: 1600 })
    expect(fitInside(800, 600, 1600)).toEqual({ width: 800, height: 600 })
  })

  it('si el navegador no puede leer la imagen, sube la original', async () => {
    const file = new File(['no es una imagen'], 'foto.jpg', { type: 'image/jpeg' })
    expect(await compressImage(file)).toBe(file)
  })
})
