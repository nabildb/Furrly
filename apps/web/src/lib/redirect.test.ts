import { describe, expect, it } from 'vitest'
import { safeRedirect } from './redirect'

describe('redirección tras el login', () => {
  it('acepta rutas internas', () => {
    expect(safeRedirect('/mensajes/nuevo?para=ana_g')).toBe('/mensajes/nuevo?para=ana_g')
  })

  it('rechaza cualquier cosa que lleve a otro dominio', () => {
    for (const evil of ['https://evil.com', '//evil.com', '/\\evil.com', 'javascript:alert(1)', '', null, 42]) {
      expect(safeRedirect(evil)).toBe('/avisos')
    }
  })
})
