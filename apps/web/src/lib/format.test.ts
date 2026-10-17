import { afterEach, describe, expect, it, vi } from 'vitest'
import { cx } from './cx'
import { escapeHtml } from './html'
import { formatDistance, formatWhen } from './reports'

describe('formato', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('distancias en metros redondeados o en km con coma decimal', () => {
    expect(formatDistance(347)).toBe('350 m')
    expect(formatDistance(1590)).toBe('1,6 km')
    expect(formatDistance(12_000)).toBe('12 km')
  })

  it('fechas cortas: hoy, ayer o día y mes', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 17, 12, 0))
    expect(formatWhen(new Date(2026, 9, 17, 9, 5).toISOString())).toBe('Hoy, 9:05')
    expect(formatWhen(new Date(2026, 9, 16, 22, 30).toISOString())).toBe('Ayer, 22:30')
    expect(formatWhen(new Date(2026, 9, 3, 8, 0).toISOString())).toMatch(/^3 oct\.?, 8:00$/)
  })

  it('cx ignora las clases vacías', () => {
    expect(cx('a', false, null, undefined, 'b')).toBe('a b')
  })

  it('escapeHtml neutraliza HTML (los marcadores del mapa se construyen con HTML)', () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">')).not.toMatch(/[<>"]/)
    expect(escapeHtml("Toby & 'Luna'")).toBe('Toby &#38; &#39;Luna&#39;')
  })
})
