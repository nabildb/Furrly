import type { ButtonHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router'
import { buttonClass, type ButtonSize, type ButtonVariant } from './styles'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export function Button({ variant, size, className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />
}

interface ButtonLinkProps extends Omit<LinkProps, 'className'> {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
}

/** Enlace con aspecto de botón (navegar no es una acción: semánticamente es un <a>). */
export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClass(variant, size, className)} {...props} />
}
