import { afterEach, describe, expect, it, vi } from 'vitest'
import { request } from './helpers.js'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('buscar un lugar (geocodificación)', () => {
  it('pregunta a Nominatim identificándose y devuelve el punto y un nombre corto, cacheable', async () => {
    const calls: { url: string; userAgent: string }[] = []
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      calls.push({ url: String(input), userAgent: (init?.headers as Record<string, string>)['User-Agent'] })
      return Response.json([{ lat: '40.4153', lon: '-3.6845', display_name: 'Parque del Retiro, Madrid, Comunidad de Madrid, España' }])
    })

    const res = await request.get('/geocode').query({ q: 'Retiro' })
    expect(res.body).toEqual({ lat: 40.4153, lng: -3.6845, label: 'Parque del Retiro, Madrid' })
    expect(res.headers['cache-control']).toContain('s-maxage=86400')
    expect(calls[0].url).toMatch(/^https:\/\/nominatim\.openstreetmap\.org\/search\?q=Retiro&/)
    expect(calls[0].userAgent).toMatch(/^Furrly/)
  })

  it('sin resultados devuelve null, y valida lo que se busca', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json([]))
    expect((await request.get('/geocode').query({ q: 'xyzxyz' })).body).toBeNull()
    expect((await request.get('/geocode').query({ q: 'a' })).status).toBe(400)
    expect((await request.get('/geocode').query({ q: 'a'.repeat(200) })).status).toBe(400)
  })
})
