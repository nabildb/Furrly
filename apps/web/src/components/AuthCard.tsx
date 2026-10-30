import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { CheckIcon, EyeIcon, PinIcon } from './ui/icons'
import { Logo, LogoMark } from './ui/Logo'
import { useDocumentTitle } from '../lib/useDocumentTitle'

interface AuthCardProps {
  title: string
  subtitle?: string
  children: ReactNode
  /** Enlaces bajo la tarjeta ("¿No tienes cuenta?..."). */
  footer?: ReactNode
}

const points = [
  { icon: <PinIcon size={20} />, text: 'Avisos de mascotas perdidas y encontradas en tu barrio' },
  { icon: <EyeIcon size={20} />, text: 'Avisa si la ves y sigue su recorrido en el mapa' },
  { icon: <CheckIcon size={20} />, text: 'Ten listo su carnet por si algún día se pierde' },
]

/** Panel de marca que acompaña al formulario en escritorio (mismo estilo que el carnet). */
function BrandPanel() {
  return (
    <div className="relative hidden overflow-hidden rounded-[28px] bg-ink p-8 text-white lg:flex lg:flex-col">
      <div aria-hidden="true" className="absolute -top-16 -right-16 h-60 w-60 rounded-full bg-lost opacity-90" />
      <LogoMark size={52} className="relative" />
      <p className="relative mt-auto pt-16 font-display text-[30px] leading-[1.1] font-extrabold tracking-[-1px]">
        Que ninguna mascota se quede sin volver a casa.
      </p>
      <ul className="relative mt-6 space-y-3">
        {points.map(({ icon, text }) => (
          <li key={text} className="flex items-start gap-3 text-[15px] font-bold text-[#D9DDE3]">
            <span className="mt-0.5 text-white">{icon}</span>
            {text}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Marco de login, registro y contraseña: logo y tarjeta centrada; en escritorio, junto al panel de marca. */
export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  useDocumentTitle(title)

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 pt-8 pb-32 lg:grid lg:max-w-5xl lg:grid-cols-2 lg:items-stretch lg:gap-6 lg:px-10 lg:py-10">
      <BrandPanel />
      <div className="flex flex-col justify-center">
        {/* En escritorio el logo ya está en la barra lateral y en el panel. */}
        <Link to="/avisos" className="mb-7 self-center lg:hidden" aria-label="Furrly, ir al mapa">
          <Logo size={44} />
        </Link>
        <div className="rounded-[28px] border border-card-line bg-surface p-6 lg:p-8">
          <h1 className="font-display text-2xl leading-tight font-extrabold tracking-[-0.8px]">{title}</h1>
          {subtitle && <p className="mt-1.5 text-[15px] font-semibold text-muted">{subtitle}</p>}
          <div className="mt-5">{children}</div>
        </div>
        {footer && <div className="mt-5 space-y-2 text-center text-[15px] font-semibold text-muted">{footer}</div>}
      </div>
    </main>
  )
}

/** Enlace de texto dentro de los formularios de acceso. */
export function AuthLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="font-extrabold text-lost-text underline-offset-2 hover:underline">
      {children}
    </Link>
  )
}
