import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Avatar } from '../components/Avatar'
import { ErrorText, Field } from '../components/Field'
import { Loading, Page } from '../components/Page'
import { Card } from '../components/ui/Card'
import { ArrowRightIcon } from '../components/ui/icons'
import { api } from '../lib/api'

interface FoundUser {
  username: string
  displayName: string
  avatarUrl: string | null
  petsCount: number
}

/** Buscar perfiles por nombre o @usuario. Lo buscado va en la URL (?q=) para que "volver" lo conserve. */
export function SearchUsers() {
  const [params, setParams] = useSearchParams()
  const [text, setText] = useState(params.get('q') ?? '')
  const [results, setResults] = useState<FoundUser[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const q = text.trim().replace(/^@/, '')
  // Al guardar la búsqueda en la URL, React Router da un setParams nuevo y el efecto se repetiría.
  const searched = useRef<string | null>(null)

  useEffect(() => {
    if (q.length < 2 || q === searched.current) return
    // Se espera a que deje de escribir: una petición por búsqueda, no por letra.
    const timer = setTimeout(() => {
      searched.current = q
      setParams({ q }, { replace: true })
      setError(null)
      api<FoundUser[]>(`/users?q=${encodeURIComponent(q)}`)
        .then(setResults)
        .catch((e: Error) => setError(e.message))
    }, 300)
    return () => clearTimeout(timer)
  }, [q, setParams])

  return (
    <Page title="Buscar perfiles" back="/comunidad">
      <Field
        label="Nombre o usuario"
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ej.: ana o @ana_g"
        autoFocus
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
      />

      <div className="mt-5">
        {error && <ErrorText>{error}</ErrorText>}
        {q.length < 2 ? (
          <p className="text-center text-[15px] font-semibold text-muted">Escribe al menos 2 letras.</p>
        ) : !results ? (
          !error && <Loading label="Buscando…" />
        ) : results.length === 0 ? (
          <p className="text-center text-[15px] font-semibold text-muted">No hay nadie con ese nombre.</p>
        ) : (
          <Card className="divide-y divide-card-line overflow-hidden p-0">
            {results.map((u) => (
              <Link key={u.username} to={`/u/${u.username}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-subtle">
                <Avatar url={u.avatarUrl} name={u.displayName} className="h-11 w-11 text-lg" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-extrabold">{u.displayName}</span>
                  <span className="block truncate text-sm font-semibold text-muted">
                    @{u.username} · {u.petsCount === 1 ? '1 mascota' : `${u.petsCount} mascotas`}
                  </span>
                </span>
                <ArrowRightIcon size={18} className="flex-none text-muted" />
              </Link>
            ))}
          </Card>
        )}
      </div>
    </Page>
  )
}
