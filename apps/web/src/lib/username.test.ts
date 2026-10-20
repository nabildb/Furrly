import { describe, expect, it } from 'vitest'
import { normalizeUsername, usernameProblem } from './username'

describe('nombre de usuario', () => {
  it('corrige mayúsculas, tildes, ñ y espacios al escribir', () => {
    expect(normalizeUsername('Pau Mulet')).toBe('pau_mulet')
    expect(normalizeUsername('José  Peña')).toBe('jose_pena')
    expect(normalizeUsername('NABIL_22')).toBe('nabil_22')
  })

  it('acepta lo mismo que la API', () => {
    for (const ok of ['abc', 'nabil', 'pau_mulet', 'a1_', 'x'.repeat(30)]) expect(usernameProblem(ok)).toBeNull()
  })

  it('explica en español qué sobra o qué falta', () => {
    expect(usernameProblem('pau.mulet')).toBe('No puede llevar «.». Usa letras sin tilde, números o _.')
    expect(usernameProblem('a-b@c-d')).toBe('No puede llevar «-» «@». Usa letras sin tilde, números o _.')
    expect(usernameProblem('ab')).toBe('Tiene que tener al menos 3 caracteres.')
    expect(usernameProblem('x'.repeat(31))).toBe('Como mucho 30 caracteres.')
  })
})
