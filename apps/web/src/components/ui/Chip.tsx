import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { chipClass } from './styles'

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  /** Punto de color delante del texto (p. ej. naranja = perdidas). */
  dot?: string
  /** Sobre el mapa los chips flotan: llevan sombra en vez de borde. */
  floating?: boolean
  children: ReactNode
}

/** Pastilla de filtro o selección. Usa aria-pressed para que los lectores de pantalla sepan si está activa. */
export function Chip({ active = false, dot, floating, className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cx(chipClass(active, floating), className)}
      {...props}
    >
      {dot && <span className="h-2 w-2 flex-none rounded-full" style={{ background: dot }} />}
      {children}
    </button>
  )
}
