import { cx } from '../../lib/cx'

// Clases de los componentes base, separadas de los .tsx para poder dárselas
// también a un <Link> o un <label> (y para que Fast Refresh siga funcionando).

export type ButtonVariant = 'primary' | 'sighting' | 'dark' | 'outline' | 'secondary' | 'danger'
export type ButtonSize = 'lg' | 'md'

const base =
  'inline-flex items-center justify-center gap-2 font-extrabold transition disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]'

const variants: Record<ButtonVariant, string> = {
  // Naranja de marca: la acción principal (Publicar).
  primary: 'bg-lost text-white hover:bg-lost-text',
  // Ámbar con texto tinta: el blanco sobre ámbar no llega al contraste mínimo.
  sighting: 'bg-sighting text-ink hover:brightness-95',
  dark: 'bg-ink text-white hover:bg-ink/90',
  outline: 'border-2 border-lost bg-surface text-lost-text hover:bg-lost-soft',
  secondary: 'border border-line bg-surface text-ink hover:bg-subtle',
  danger: 'border border-line bg-surface text-danger hover:bg-lost-soft',
}

// lg: botones principales (56 px, Unbounded); md: acciones secundarias (44 px, Nunito Sans).
const sizes: Record<ButtonSize, string> = {
  lg: 'h-14 rounded-btn px-[22px] text-center font-display text-[15px] leading-tight',
  md: 'h-11 rounded-[14px] px-4 text-[15px]',
}

export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'lg', className?: string) {
  return cx(base, variants[variant], sizes[size], className)
}

/** Botón redondo de 44 px solo con icono (volver, compartir, editar...). Necesita aria-label. */
export function iconButtonClass(className?: string) {
  return cx(
    'flex h-11 w-11 flex-none items-center justify-center rounded-full border border-line bg-surface text-ink transition hover:bg-subtle',
    className,
  )
}

export function chipClass(active: boolean, floating?: boolean) {
  return cx(
    'inline-flex h-[38px] flex-none items-center gap-1.5 rounded-chip px-3.5 text-sm font-extrabold whitespace-nowrap transition',
    active
      ? 'bg-ink text-white'
      : floating
        ? 'bg-surface text-ink shadow-chip hover:bg-subtle'
        : 'border border-line bg-surface text-ink hover:bg-subtle',
  )
}
