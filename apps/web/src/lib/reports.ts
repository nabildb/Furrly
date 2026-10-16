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

export const reportColors: Record<ReportType, string> = {
  lost: '#dc2626',
  found: '#16a34a',
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
