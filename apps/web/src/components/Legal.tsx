import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router'
import { cx } from '../lib/cx'
import { LEGAL, legalPages } from '../lib/legal'
import { Page } from './Page'

/** Marco común de las páginas legales: introducción, fecha y, al final, enlaces a las demás. */
export function LegalPage({ title, intro, children }: { title: string; intro: ReactNode; children: ReactNode }) {
  return (
    <Page title={title} back="/avisos">
      <div className="space-y-7">
        <p className="text-[15px] leading-relaxed text-body">
          {intro} Última actualización: {LEGAL.updated}.
        </p>
        {children}
        <LegalLinks className="border-t border-card-line pt-5" />
      </div>
    </Page>
  )
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-lg font-extrabold">{title}</h2>
      <div className="space-y-2 text-[15px] leading-relaxed text-body [&_li]:ml-5 [&_li]:list-disc">{children}</div>
    </section>
  )
}

/** Enlace de texto dentro de los textos legales (a otra página o a una web externa). */
export function TextLink({ to, children }: { to: string; children: ReactNode }) {
  const className = 'font-extrabold text-lost-text underline-offset-2 hover:underline'
  if (to.startsWith('/'))
    return (
      <Link to={to} className={className}>
        {children}
      </Link>
    )
  return (
    <a href={to} className={className} target="_blank" rel="noreferrer">
      {children}
    </a>
  )
}

export function ContactEmail() {
  return <TextLink to={`mailto:${LEGAL.email}`}>{LEGAL.email}</TextLink>
}

/** Fila de enlaces legales: pie de las páginas legales, de entrar/registrarse, del perfil y de la barra lateral. */
export function LegalLinks({ className }: { className?: string }) {
  return (
    <nav aria-label="Información legal" className={className}>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-bold text-muted">
        {legalPages.map(({ to, label }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) => cx('underline-offset-2 hover:underline', isActive && 'text-ink')}
            >
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** Lo que se acepta al crear la cuenta (con email o con Google): se muestra junto al botón. */
export function SignUpNotice({ action }: { action: string }) {
  return (
    <p className="text-[13px] leading-relaxed font-semibold text-muted">
      Al {action} aceptas las <TextLink to="/condiciones">condiciones de uso</TextLink> y confirmas que tienes{' '}
      {LEGAL.minAge} años o más. Tus datos los trata {LEGAL.owner} solo para que Furrly funcione; puedes consultarlos,
      corregirlos o borrarlos cuando quieras. Más información en <TextLink to="/privacidad">Privacidad</TextLink>.
    </p>
  )
}
