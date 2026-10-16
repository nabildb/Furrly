import type { ReactNode } from 'react'
import { BellIcon, CommunityIcon, ListIcon, MapIcon, MessageIcon, PawOutlineIcon, UserIcon } from './icons'

export interface NavItem {
  to: string
  label: string
  icon: ReactNode
  /** /avisos no debe quedar activo en /avisos/123 (la ficha no es "el mapa"). */
  end?: boolean
  /** Otras rutas que cuelgan de esta pestaña. */
  also?: string[]
  /** Solo en la barra lateral, donde hay sitio para más opciones. */
  wideOnly?: boolean
  /** Contador del buzón que se pinta en el globo. */
  badge?: 'messages' | 'notifications' | 'all'
}

// Mismas secciones en la barra flotante (móvil/tablet) y en la lateral (escritorio).
export const navItems: NavItem[] = [
  { to: '/avisos', label: 'Mapa', icon: <MapIcon />, end: true },
  { to: '/comunidad', label: 'Comunidad', icon: <CommunityIcon />, also: ['/publicaciones'] },
  { to: '/mascotas', label: 'Mascotas', icon: <PawOutlineIcon size={24} /> },
  { to: '/mensajes', label: 'Mensajes', icon: <MessageIcon />, wideOnly: true, badge: 'messages' },
  { to: '/notificaciones', label: 'Notificaciones', icon: <BellIcon />, wideOnly: true, badge: 'notifications' },
  { to: '/avisos/mios', label: 'Mis avisos', icon: <ListIcon />, wideOnly: true },
  // En móvil, mensajes y notificaciones se abren desde el perfil: su globo suma ambos.
  { to: '/perfil', label: 'Perfil', icon: <UserIcon size={24} />, badge: 'all' },
]
