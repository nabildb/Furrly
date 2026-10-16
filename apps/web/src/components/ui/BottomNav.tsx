import { NavLink, useLocation } from 'react-router'
import { useInbox } from '../../inbox/useInbox'
import { cx } from '../../lib/cx'
import { CountBadge } from './CountBadge'
import { PlusIcon } from './icons'
import { navItems, type NavItem } from './navItems'

function Tab({ to, label, icon, end, also = [], badge }: NavItem) {
  const { pathname } = useLocation()
  const inbox = useInbox()
  const count = badge === 'all' ? inbox.messages + inbox.notifications : badge ? inbox[badge] : 0
  const inSubpage = also.some((path) => pathname.startsWith(path))
  return (
    <NavLink
      to={to}
      end={end}
      aria-label={label}
      className={({ isActive }) =>
        cx(
          'relative flex h-12 items-center gap-2 rounded-2xl text-sm font-extrabold transition',
          // La pestaña activa se convierte en pastilla blanca con texto; las demás son solo icono.
          isActive || inSubpage ? 'bg-white px-4 text-ink' : 'w-12 justify-center text-white hover:bg-white/10',
        )
      }
    >
      {({ isActive }) => (
        <>
          {icon}
          {(isActive || inSubpage) && <span>{label}</span>}
          <CountBadge count={count} className="absolute -top-1 -right-1 ring-2 ring-ink" />
        </>
      )}
    </NavLink>
  )
}

// En la barra de abajo no cabe "Mis avisos": se llega desde el perfil, que queda marcado.
const tabs = navItems
  .filter((item) => !item.wideOnly)
  .map((item) => (item.to === '/perfil' ? { ...item, also: ['/avisos/mios', '/mensajes', '/notificaciones'] } : item))

/** Barra de navegación flotante y oscura, abajo y centrada (móvil y tablet). */
export function BottomNav() {
  // El botón de publicar queda en el centro: dos pestañas a cada lado.
  const left = tabs.slice(0, 2)
  const right = tabs.slice(2)
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-4 bottom-[max(20px,env(safe-area-inset-bottom))] z-[1100] mx-auto flex h-[68px] max-w-md items-center justify-around rounded-3xl bg-ink px-2 shadow-card lg:hidden"
    >
      {left.map((item) => (
        <Tab key={item.to} {...item} />
      ))}
      <NavLink
        to="/avisos/nuevo"
        aria-label="Publicar aviso"
        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lost text-white transition hover:bg-lost-text"
      >
        <PlusIcon size={24} />
      </NavLink>
      {right.map((item) => (
        <Tab key={item.to} {...item} />
      ))}
    </nav>
  )
}
