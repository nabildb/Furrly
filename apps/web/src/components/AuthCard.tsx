import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Logo } from './ui/Logo'

interface AuthCardProps {
  title: string
  subtitle?: string
  children: ReactNode
  /** Enlaces bajo la tarjeta ("¿No tienes cuenta?..."). */
  footer?: ReactNode
}

/** Marco de login, registro y contraseña: logo arriba y tarjeta centrada. */
export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 pt-8 pb-32">
      <Link to="/avisos" className="mb-7 self-center" aria-label="Furrly, ir al mapa">
        <Logo size={44} />
      </Link>
      <div className="rounded-[28px] border border-card-line bg-surface p-6">
        <h1 className="font-display text-2xl leading-tight font-extrabold tracking-[-0.8px]">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[15px] font-semibold text-muted">{subtitle}</p>}
        <div className="mt-5">{children}</div>
      </div>
      {footer && <div className="mt-5 space-y-2 text-center text-[15px] font-semibold text-muted">{footer}</div>}
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
