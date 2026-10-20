import { Link, NavLink, useLocation } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import { useMe } from '../../auth/useMe'
import { useInbox } from '../../inbox/useInbox'
import { cx } from '../../lib/cx'
import { CountBadge } from './CountBadge'
import { ButtonLink } from './Button'
import { PlusIcon } from './icons'
import { Logo } from './Logo'
import { navItems } from './navItems'

/** Barra lateral fija de escritorio (≥ 1024 px). En pantallas menores la sustituye BottomNav. */
export function Sidebar() {
  const { session } = useAuth()
  const me = useMe()
  const username = me.username
  const displayName = me.displayName ?? username
  const { pathname } = useLocation()
  const inbox = useInbox()

  return (
    <aside className="fixed inset-y-0 left-0 z-[1100] hidden w-(--sidebar-w) flex-col border-r border-card-line bg-surface px-4 py-6 lg:flex">
      <Link to="/avisos" aria-label="Furrly, ir al mapa" className="mb-8 px-2">
        <Logo size={40} />
      </Link>

      <ButtonLink to="/avisos/nuevo" className="mb-6 w-full">
        <PlusIcon /> Publicar aviso
      </ButtonLink>

      <nav aria-label="Navegación principal" className="flex flex-col gap-1">
        {navItems.map(({ to, label, icon, end, also = [], badge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cx(
                'flex h-12 items-center gap-3 rounded-2xl px-3.5 text-[15px] font-extrabold transition',
                isActive || also.some((path) => pathname.startsWith(path)) ? 'bg-ink text-white' : 'text-ink hover:bg-subtle',
              )
            }
          >
            {icon}
            {label}
            {/* En la barra lateral Mensajes y Notificaciones tienen su propia entrada: Perfil no suma nada. */}
            {badge && badge !== 'all' && <CountBadge count={inbox[badge]} className="ml-auto" />}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto">
        {session ? (
          <Link to="/perfil" className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-subtle">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-lost-soft font-display font-extrabold text-lost-text">
              {displayName?.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-extrabold">{displayName}</span>
              <span className="block truncate text-[13px] font-semibold text-muted">@{username}</span>
            </span>
          </Link>
        ) : (
          <div className="space-y-2">
            <ButtonLink to="/login" variant="dark" size="md" className="w-full">
              Entrar
            </ButtonLink>
            <ButtonLink to="/registro" variant="secondary" size="md" className="w-full">
              Crear cuenta
            </ButtonLink>
          </div>
        )}
      </div>
    </aside>
  )
}
