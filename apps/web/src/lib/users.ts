import type { LatLng } from './reports'

export interface Me {
  id: string
  username: string
  /** false = entró con Google/Apple y aún no ha elegido su username (tiene uno provisional). */
  usernameConfirmed: boolean
  displayName: string
  avatarUrl: string | null
  bio: string | null
  alertRadiusKm: number
  alertLocation: LatLng | null
}

export interface PublicProfile {
  username: string
  displayName: string
  avatarUrl: string | null
  bio: string | null
  createdAt: string
  petsCount: number
  reportsCount: number
  /** Solo con sesión: si lo has bloqueado tú. */
  blockedByMe: boolean
}
