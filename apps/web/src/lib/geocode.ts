import type { LatLng } from './reports'

export interface Place extends LatLng {
  label: string
}

/**
 * Busca un lugar por texto con Nominatim (el geocodificador de OpenStreetMap, gratis y sin clave).
 * Su política de uso pide no buscar mientras se escribe: solo llamamos al enviar el formulario.
 */
export async function searchPlace(query: string): Promise<Place | null> {
  const params = new URLSearchParams({ q: query, format: 'jsonv2', limit: '1', 'accept-language': 'es' })
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`)
  if (!res.ok) throw new Error('No se pudo buscar la zona')
  const [first] = (await res.json()) as { lat: string; lon: string; display_name: string }[]
  if (!first) return null
  // "Parque del Retiro, Madrid, Comunidad de Madrid, España" → "Parque del Retiro, Madrid"
  const label = first.display_name.split(', ').slice(0, 2).join(', ')
  return { lat: Number(first.lat), lng: Number(first.lon), label }
}
