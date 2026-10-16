/** Une clases de Tailwind ignorando las vacías: cx('a', cond && 'b'). */
export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
