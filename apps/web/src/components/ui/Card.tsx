import type { HTMLAttributes } from 'react'
import { cx } from '../../lib/cx'

/** Superficie blanca con borde suave: el contenedor por defecto de la app. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('rounded-card border border-card-line bg-surface p-4', className)} {...props} />
}

/** Título de sección dentro de una tarjeta o página (Unbounded 16 px). */
export function SectionTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cx('font-display text-base font-extrabold tracking-[-0.3px]', className)} {...props} />
}
