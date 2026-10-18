import { describe, expect, it } from 'vitest'
import { cx } from './cx'

describe('cx', () => {
  it('ignora las vacías y, si dos clases chocan, gana la última', () => {
    expect(cx('flex gap-2', false, null, 'gap-3')).toBe('flex gap-3')
    expect(cx('h-11 text-ink', 'h-12')).toBe('text-ink h-12')
    // Las del diseño (colores y tamaños propios) no se confunden entre sí.
    expect(cx('font-display text-[15px] text-lost', 'font-extrabold text-muted')).toBe('font-display text-[15px] font-extrabold text-muted')
  })
})
