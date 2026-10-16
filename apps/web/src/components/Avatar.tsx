import { cx } from '../lib/cx'

interface AvatarProps {
  url: string | null
  name: string
  className?: string
}

/** Foto de perfil o, si no hay, la inicial del nombre. */
export function Avatar({ url, name, className = 'h-16 w-16 text-2xl' }: AvatarProps) {
  return (
    <div
      className={cx(
        'flex flex-none items-center justify-center overflow-hidden rounded-full bg-lost-soft font-display font-extrabold text-lost-text',
        className,
      )}
    >
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : name.charAt(0).toUpperCase()}
    </div>
  )
}
