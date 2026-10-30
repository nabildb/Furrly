import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { cx } from '../lib/cx'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { ErrorText } from './Field'
import { BackIcon, PawIcon } from './ui/icons'
import { iconButtonClass } from './ui/styles'

interface PageProps {
  title: string
  /** Muestra la flecha de volver; el valor es adónde ir si no hay historial (p. ej. al abrir un enlace directo). */
  back?: string
  /** Botón redondo de la derecha (editar, compartir...). */
  action?: ReactNode
  /** Título grande (páginas principales) o pequeño y centrado entre botones (subpáginas). */
  variant?: 'main' | 'sub'
  /** Hueco abajo para la navegación flotante o la barra de acciones (en escritorio no hace falta). */
  bottomSpace?: boolean
  /** 'feed': columna de publicaciones; 'narrow': una columna de lectura; 'wide': dos columnas en escritorio. */
  width?: 'feed' | 'narrow' | 'wide'
  className?: string
  children: ReactNode
}

/** Contenedor de las páginas normales: centrado, con ancho máximo y cabecera común. */
export function Page({
  title,
  back,
  action,
  variant = back ? 'sub' : 'main',
  bottomSpace = true,
  width = 'narrow',
  className,
  children,
}: PageProps) {
  useDocumentTitle(title)

  return (
    <main
      className={cx(
        'mx-auto w-full px-4 pt-4 sm:px-6 sm:pt-8 lg:px-10 lg:pt-10',
        { feed: 'max-w-xl', narrow: 'max-w-2xl', wide: 'max-w-5xl' }[width],
        bottomSpace && 'pb-32 lg:pb-12',
        className,
      )}
    >
      {variant === 'sub' ? (
        // Móvil: título pequeño centrado entre botones. Escritorio: título grande a la izquierda.
        <header className="mb-5 flex items-center justify-between gap-3 lg:mb-8 lg:justify-start lg:gap-4">
          {back ? <BackButton fallback={back} /> : <span className="w-11 lg:hidden" />}
          <h1 className="truncate font-display text-[15px] font-extrabold lg:text-[28px] lg:tracking-[-0.8px]">{title}</h1>
          <div className="lg:ml-auto">{action ?? <span className="block w-11" />}</div>
        </header>
      ) : (
        <header className="mb-6 flex items-center justify-between gap-3">
          <h1 className="font-display text-[28px] leading-tight font-extrabold tracking-[-0.8px]">{title}</h1>
          {action}
        </header>
      )}
      {children}
    </main>
  )
}

export function BackButton({ fallback, className }: { fallback: string; className?: string }) {
  const navigate = useNavigate()
  const location = useLocation()
  // 'default' = primera página que se abrió en esta pestaña: no hay a dónde volver.
  const canGoBack = location.key !== 'default'
  return (
    <button
      type="button"
      aria-label="Volver"
      onClick={() => (canGoBack ? navigate(-1) : navigate(fallback))}
      className={className ?? iconButtonClass()}
    >
      <BackIcon size={22} />
    </button>
  )
}

/** Estado de carga a pantalla completa (huella que late). */
export function Loading({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div role="status" className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted">
      <PawIcon size={40} className="animate-pulse text-lost/60" />
      <span className="text-sm font-bold">{label}</span>
    </div>
  )
}

/** Error al cargar una página entera. */
export function PageError({ message, back = '/avisos' }: { message: string; back?: string }) {
  return (
    <Page title="Algo ha fallado" back={back}>
      <ErrorText>{message}</ErrorText>
    </Page>
  )
}
