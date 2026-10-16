interface AvatarProps {
  url: string | null
  name: string
  className?: string
}

/** Foto de perfil o, si no hay, la inicial del nombre. */
export function Avatar({ url, name, className = 'h-16 w-16 text-2xl' }: AvatarProps) {
  return (
    <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 font-semibold text-gray-600 ${className}`}>
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : name.charAt(0).toUpperCase()}
    </div>
  )
}
