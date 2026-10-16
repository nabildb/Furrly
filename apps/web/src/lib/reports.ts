import type { Species } from './pets'

export type ReportType = 'lost' | 'found'
export type ReportStatus = 'active' | 'resolved' | 'cancelled'

export interface LatLng {
  lat: number
  lng: number
}

// Puerta del Sol: centro por defecto mientras no sabemos dónde está el usuario.
export const DEFAULT_CENTER: LatLng = { lat: 40.4168, lng: -3.7038 }

export interface Report {
  id: string
  type: ReportType
  status: ReportStatus
  species: Species
  title: string
  description: string
  addressText: string | null
  happenedAt: string
  resolvedAt: string | null
  createdAt: string
  reporter: { username: string; displayName: string }
  pet: { id: string; name: string; breed: string | null; photoUrl: string | null } | null
  photos: string[]
  location: LatLng
}

export const reportTypeLabels: Record<ReportType, string> = {
  lost: 'Perdida',
  found: 'Encontrada',
}

export const reportStatusLabels: Record<ReportStatus, string> = {
  active: 'Activo',
  resolved: 'Resuelto',
  cancelled: 'Cancelado',
}

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(iso))
}

export interface NearbyReport {
  id: string
  type: ReportType
  species: Species
  title: string
  addressText: string | null
  happenedAt: string
  location: LatLng
  distanceM: number
  photoUrl: string | null
}

// Leaflet pinta con colores en JS: son los mismos valores que los tokens de src/index.css.
export const reportColors: Record<ReportType, string> = {
  lost: '#C2410C',
  found: '#1E5BB8',
}

export function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`
  return `${(meters / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} km`
}

/** "hace 3 h", "hace 2 días"... */
export function formatTimeAgo(iso: string) {
  const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })
  const minutes = Math.round((new Date(iso).getTime() - Date.now()) / 60000)
  if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return rtf.format(hours, 'hour')
  return rtf.format(Math.round(hours / 24), 'day')
}

export interface Sighting {
  id: string
  seenAt: string
  note: string | null
  photoUrl: string | null
  createdAt: string
  location: LatLng
  user: { username: string; displayName: string }
}

export const SIGHTING_COLOR = '#F59E0B'
/** Ámbar oscuro para la línea del recorrido: el ámbar claro apenas se ve sobre el mapa. */
export const SIGHTING_LINE_COLOR = '#B45309'

/** Valor para <input type="datetime-local"> (hora local, sin zona horaria). */
export function toDateTimeInput(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

export interface MyReport {
  id: string
  type: ReportType
  status: ReportStatus
  species: Species
  title: string
  addressText: string | null
  happenedAt: string
  createdAt: string
  petName: string | null
  photoUrl: string | null
  sightingsCount: number
}

/** Lee los campos comunes del formulario en el formato que espera la API. */
export function readReportFields(form: FormData, location: LatLng, photoUrls: string[]) {
  return {
    title: form.get('title'),
    description: form.get('description'),
    addressText: form.get('addressText'),
    // datetime-local no lleva zona horaria: el navegador la interpreta como hora local.
    happenedAt: new Date(String(form.get('happenedAt'))).toISOString(),
    lat: location.lat,
    lng: location.lng,
    photoUrls,
  }
}
