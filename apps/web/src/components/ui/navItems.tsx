import type { ReactNode } from 'react'
import { ListIcon, MapIcon, PawOutlineIcon, UserIcon } from './icons'

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
}

// Mismas secciones en la barra flotante (móvil/tablet) y en la lateral (escritorio).
// Para el feed social bastará con añadir aquí su entrada.
export const navItems: NavItem[] = [
  { to: '/avisos', label: 'Mapa', icon: <MapIcon />, end: true },
  { to: '/mascotas', label: 'Mascotas', icon: <PawOutlineIcon size={24} /> },
  { to: '/avisos/mios', label: 'Mis avisos', icon: <ListIcon />, wideOnly: true },
  { to: '/perfil', label: 'Perfil', icon: <UserIcon size={24} /> },
]
