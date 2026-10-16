import type { InputHTMLAttributes, ReactNode } from 'react'
import { cx } from '../../lib/cx'

interface ChoiceCardProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'title'> {
  title: string
  description: string
  icon: ReactNode
  /** Color del cuadrado del icono y del borde al elegirla. */
  tone: 'lost' | 'found'
}

/**
 * Tarjeta de elección grande. Por dentro es un <input type="radio"> de verdad (oculto):
 * así el grupo se maneja con las flechas del teclado y los lectores de pantalla lo anuncian bien.
 */
export function ChoiceCard({ title, description, icon, tone, className, ...radio }: ChoiceCardProps) {
  return (
    <label
      className={cx(
        'flex cursor-pointer items-center gap-3.5 rounded-card border-2 border-card-line bg-surface p-[18px] transition',
        'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-lost',
        tone === 'lost'
          ? 'has-[:checked]:border-lost has-[:checked]:shadow-[0_6px_18px_rgb(194_65_12/0.12)]'
          : 'has-[:checked]:border-found has-[:checked]:shadow-[0_6px_18px_rgb(30_91_184/0.12)]',
        className,
      )}
    >
      <input type="radio" className="sr-only" {...radio} />
      <span
        className={cx(
          'flex h-14 w-14 flex-none items-center justify-center rounded-2xl text-white',
          tone === 'lost' ? 'bg-lost' : 'bg-found',
        )}
      >
        {icon}
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="font-display text-base font-extrabold">{title}</span>
        <span className="text-sm font-semibold text-muted">{description}</span>
      </span>
    </label>
  )
}
