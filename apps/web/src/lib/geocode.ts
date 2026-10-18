import { api } from './api'
import type { LatLng } from './reports'

export interface Place extends LatLng {
  label: string
}

/**
 * Busca un lugar por texto. La API se lo pregunta a Nominatim (OpenStreetMap): así la IP de quien
 * busca no llega a un tercero y las búsquedas repetidas salen de caché. Su política de uso pide no
 * buscar mientras se escribe: solo llamamos al enviar el formulario.
 */
export function searchPlace(query: string) {
  return api<Place | null>(`/geocode?q=${encodeURIComponent(query)}`)
}
