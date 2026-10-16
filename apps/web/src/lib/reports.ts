import type { Species } from './pets'

export type ReportType = 'lost' | 'found'
export type ReportStatus = 'active' | 'resolved' | 'cancelled'

export interface LatLng {
  lat: number
  lng: number
}

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
