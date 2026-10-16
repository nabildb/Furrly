import { cx } from '../../lib/cx'
import { PawIcon } from './icons'

/** Huella blanca en cuadrado redondeado naranja. */
export function LogoMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cx('flex flex-none items-center justify-center bg-lost text-white', className)}
      style={{ width: size, height: size, borderRadius: size * 0.32 }}
    >
      <PawIcon size={size * 0.55} />
    </span>
  )
}

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className="font-display font-extrabold tracking-[-1px]" style={{ fontSize: size * 0.6 }}>
        Furrly
      </span>
    </span>
  )
}
