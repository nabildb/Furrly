import { twMerge } from 'tailwind-merge'

/**
 * Une clases de Tailwind ignorando las vacías: cx('a', cond && 'b'). Si dos chocan (p. ej. la base
 * de un componente trae gap-2 y quien lo usa pasa gap-3), gana la última, como se espera al
 * personalizar un componente desde fuera.
 */
export function cx(...classes: (string | false | null | undefined)[]) {
  return twMerge(classes.filter(Boolean).join(' '))
}
