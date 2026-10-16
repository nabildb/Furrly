import type { SVGProps } from 'react'
import { cx } from '../../lib/cx'

// Iconos de trazo (stroke 2–2,4) copiados del diseño C. Sin librería: son pocos y así no pesan nada.
type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Stroke({ size = 22, strokeWidth = 2, children, className, ...props }: IconProps) {
  return (
    <svg
      // Dentro de un flex, un SVG se encoge si falta sitio: los iconos mantienen siempre su tamaño.
      className={cx('flex-none', className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

/** Huella rellena del logo. */
export function PawIcon({ size = 22, className, ...props }: IconProps) {
  return (
    <svg className={cx('flex-none', className)} width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <ellipse cx="12" cy="16" rx="5" ry="4" />
      <circle cx="6" cy="10" r="2.2" />
      <circle cx="18" cy="10" r="2.2" />
      <circle cx="9.3" cy="6" r="2.2" />
      <circle cx="14.7" cy="6" r="2.2" />
    </svg>
  )
}

/** Huella de trazo (pestaña Mascotas). */
export const PawOutlineIcon = (p: IconProps) => (
  <Stroke {...p}>
    <ellipse cx="12" cy="16" rx="5" ry="4" />
    <circle cx="6" cy="10" r="2" />
    <circle cx="18" cy="10" r="2" />
    <circle cx="9.3" cy="5.5" r="2" />
    <circle cx="14.7" cy="5.5" r="2" />
  </Stroke>
)

export const MapIcon = (p: IconProps) => (
  <Stroke strokeWidth={2.2} {...p}>
    <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" />
    <path d="M9 4v14M15 6v14" />
  </Stroke>
)

export const PlusIcon = (p: IconProps) => (
  <Stroke strokeWidth={2.6} {...p}>
    <path d="M12 5v14M5 12h14" />
  </Stroke>
)

export const UserIcon = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
  </Stroke>
)

export const BackIcon = (p: IconProps) => (
  <Stroke strokeWidth={2.2} {...p}>
    <path d="m15 18-6-6 6-6" />
  </Stroke>
)

export const CloseIcon = (p: IconProps) => (
  <Stroke strokeWidth={2.4} {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Stroke>
)

export const ArrowRightIcon = (p: IconProps) => (
  <Stroke strokeWidth={2.6} {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Stroke>
)

export const ShareIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
    <path d="m16 6-4-4-4 4" />
    <path d="M12 2v13" />
  </Stroke>
)

export const EyeIcon = (p: IconProps) => (
  <Stroke strokeWidth={2.2} {...p}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </Stroke>
)

export const SearchIcon = (p: IconProps) => (
  <Stroke strokeWidth={2.2} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Stroke>
)

export const CheckIcon = (p: IconProps) => (
  <Stroke strokeWidth={2.2} {...p}>
    <path d="M20 6 9 17l-5-5" />
  </Stroke>
)

export const EditIcon = (p: IconProps) => (
  <Stroke strokeWidth={2.2} {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
  </Stroke>
)

export const ShieldIcon = (p: IconProps) => (
  <Stroke strokeWidth={2.2} {...p}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </Stroke>
)

export const AlertIcon = (p: IconProps) => (
  <Stroke strokeWidth={2.4} {...p}>
    <path d="M12 9v4M12 17h.01" />
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
  </Stroke>
)

export const LocateIcon = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
  </Stroke>
)

export const PinIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z" />
    <circle cx="12" cy="9" r="2.5" />
  </Stroke>
)

export const ClockIcon = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Stroke>
)

export const CameraIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
    <circle cx="12" cy="13.5" r="3.5" />
  </Stroke>
)

export const LogoutIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5M21 12H9" />
  </Stroke>
)

export const ListIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </Stroke>
)
