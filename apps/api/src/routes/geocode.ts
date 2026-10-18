import { Router } from 'express'
import { z } from 'zod'
import { parse } from '../lib/http.js'

/**
 * Buscar un lugar por texto (Nominatim, el geocodificador de OpenStreetMap). Pasa por la API en vez
 * de ir del navegador a Nominatim directamente: así la IP de quien busca no llega a un tercero, se
 * cumple su política de uso (User-Agent que identifica la app) y las búsquedas repetidas salen de
 * la caché de Vercel sin volver a pedirlas.
 */
export const geocodeRouter = Router()

const querySchema = z.object({ q: z.string().trim().min(2).max(120) })

geocodeRouter.get('/', async (req, res) => {
  const { q } = parse(querySchema, req.query)
  const params = new URLSearchParams({ q, format: 'jsonv2', limit: '1', 'accept-language': 'es' })
  const upstream = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { 'User-Agent': 'Furrly/1.0 (https://furrly-rouge.vercel.app)' },
  })
  if (!upstream.ok) {
    res.status(502).json({ error: 'No se pudo buscar la zona' })
    return
  }
  const [first] = (await upstream.json()) as { lat: string; lon: string; display_name: string }[]
  // Un día en la caché de Vercel: los lugares no se mueven.
  res.set('Cache-Control', 'public, max-age=3600, s-maxage=86400')
  if (!first) {
    res.json(null)
    return
  }
  // "Parque del Retiro, Madrid, Comunidad de Madrid, España" → "Parque del Retiro, Madrid"
  const label = first.display_name.split(', ').slice(0, 2).join(', ')
  res.json({ lat: Number(first.lat), lng: Number(first.lon), label })
})
