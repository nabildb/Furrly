import { cx } from '../../lib/cx'

/** Globo con el número de no leídos (9+ a partir de 10). No se pinta si es 0. */
export function CountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null
  return (
    <span
      aria-label={`${count} sin leer`}
      className={cx(
        'flex h-5 min-w-5 items-center justify-center rounded-full bg-lost px-1 text-[11px] leading-none font-extrabold text-white',
        className,
      )}
    >
      {count > 9 ? '9+' : count}
    </span>
  )
}
