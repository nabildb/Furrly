import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { LogoMark } from './Logo'

interface TopSearchBarProps {
  /** Zona que se está mostrando ("Tu ubicación", "Retiro, Madrid"...). */
  place: string
  onSearch: (query: string) => void
  searching?: boolean
  /** Botón de la derecha (p. ej. "usar mi ubicación"). */
  action?: ReactNode
}

/** Buscador flotante de la pantalla del mapa: logo + "Buscando cerca de" + acción. */
export function TopSearchBar({ place, onSearch, searching, action }: TopSearchBarProps) {
  const [query, setQuery] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (q) onSearch(q)
    setQuery('')
    ;(document.activeElement as HTMLElement | null)?.blur()
  }

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className="flex h-[58px] items-center gap-2.5 rounded-[20px] bg-surface pr-2 pl-2.5 shadow-float"
    >
      <Link to="/avisos" aria-label="Furrly, inicio">
        <LogoMark />
      </Link>
      <label className="flex min-w-0 flex-1 flex-col text-xs font-bold text-muted">
        {searching ? 'Buscando…' : 'Buscando cerca de'}
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={place}
          aria-label="Buscar otra zona (barrio, calle o ciudad)"
          enterKeyHint="search"
          className="w-full truncate border-0 bg-transparent p-0 text-base font-extrabold text-ink outline-none placeholder:text-ink focus:placeholder:text-muted/70"
        />
      </label>
      {action}
    </form>
  )
}
