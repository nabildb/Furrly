import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { api } from '../lib/api'
import { Avatar } from './Avatar'
import { Field } from './Field'
import { Card } from './ui/Card'
import { ArrowRightIcon } from './ui/icons'

interface FoundUser {
  username: string
  displayName: string
  avatarUrl: string | null
}

/** Buscar una cuenta para abrir su ficha, sin esperar a que la denuncien. */
export function ModeratorUserSearch() {
  const [text, setText] = useState('')
  const [results, setResults] = useState<FoundUser[]>([])
  const q = text.trim().replace(/^@/, '')

  useEffect(() => {
    if (q.length < 2) return
    // Se espera a que deje de escribir: una petición por búsqueda, no por letra.
    const timer = setTimeout(() => {
      api<FoundUser[]>(`/users?q=${encodeURIComponent(q)}`)
        .then(setResults)
        .catch(() => setResults([]))
    }, 300)
    return () => clearTimeout(timer)
  }, [q])

  return (
    <div className="mb-5 space-y-2">
      <Field label="Buscar una cuenta" value={text} onChange={(e) => setText(e.target.value)} placeholder="Nombre o @usuario" autoComplete="off" />
      {q.length >= 2 && results.length > 0 && (
        <Card className="p-2">
          <ul>
            {results.slice(0, 5).map((user) => (
              <li key={user.username}>
                <Link to={`/moderacion/usuarios/${user.username}`} className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-subtle">
                  <Avatar url={user.avatarUrl} name={user.displayName} className="h-9 w-9 text-sm" />
                  <span className="min-w-0 flex-1 truncate text-[15px] font-bold">
                    {user.displayName} <span className="text-muted">@{user.username}</span>
                  </span>
                  <ArrowRightIcon size={18} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
