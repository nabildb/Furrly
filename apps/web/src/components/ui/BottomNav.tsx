import type { ReactNode } from 'react'
import { NavLink } from 'react-router'
import { cx } from '../../lib/cx'
import { MapIcon, PawOutlineIcon, PlusIcon, UserIcon } from './icons'

interface Item {
  to: string
  label: string
  icon: ReactNode
  /** /avisos no debe quedar activo en /avisos/123 (la ficha no es "el mapa"). */
  end?: boolean
}

const items: Item[] = [
  { to: '/avisos', label: 'Mapa', icon: <MapIcon />, end: true },
  { to: '/mascotas', label: 'Mascotas', icon: <PawOutlineIcon size={24} /> },
  { to: '/perfil', label: 'Perfil', icon: <UserIcon size={24} /> },
]

function Tab({ to, label, icon, end }: Item) {
  return (
    <NavLink
      to={to}
      end={end}
      aria-label={label}
      className={({ isActive }) =>
        cx(
          'flex h-12 items-center gap-2 rounded-2xl text-sm font-extrabold transition',
          // La pestaña activa se convierte en pastilla blanca con texto; las demás son solo icono.
          isActive ? 'bg-white px-4 text-ink' : 'w-12 justify-center text-white hover:bg-white/10',
        )
      }
    >
      {({ isActive }) => (
        <>
          {icon}
          {isActive && <span>{label}</span>}
        </>
      )}
    </NavLink>
  )
}

/** Barra de navegación flotante y oscura, abajo y centrada (móvil y escritorio). */
export function BottomNav() {
  const [map, ...rest] = items
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-4 bottom-[max(20px,env(safe-area-inset-bottom))] z-[1100] mx-auto flex h-[68px] max-w-md items-center justify-around rounded-3xl bg-ink px-2 shadow-card"
    >
      <Tab {...map} />
      <NavLink
        to="/avisos/nuevo"
        aria-label="Publicar aviso"
        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lost text-white transition hover:bg-lost-text"
      >
        <PlusIcon size={24} />
      </NavLink>
      {rest.map((item) => (
        <Tab key={item.to} {...item} />
      ))}
    </nav>
  )
}
