import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { Avatar } from '../components/Avatar'
import { api } from '../lib/api'
import type { Me } from '../lib/users'

export function Home() {
  const { session, loading } = useAuth()
  const [me, setMe] = useState<Me | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!session) return
    api<Me>('/me')
      .then(setMe)
      .catch((e: Error) => setError(e.message))
  }, [session])

  if (loading) return <p>Cargando…</p>

  if (!session) {
    return (
      <section className="space-y-4">
        <p className="text-gray-600">Mascotas perdidas y encontradas cerca de ti.</p>
        <Link to="/avisos" className="inline-block rounded bg-black px-4 py-2 text-white">
          Ver avisos cerca
        </Link>
      </section>
    )
  }

  if (error) return <p className="text-red-600">{error}</p>
  if (!me) return <p>Cargando perfil…</p>

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <Avatar url={me.avatarUrl} name={me.displayName} className="h-12 w-12 text-xl" />
        <div>
          <h1 className="text-xl font-semibold">Hola, {me.displayName}</h1>
          <p className="text-sm text-gray-600">@{me.username}</p>
        </div>
      </div>

      {!me.alertLocation && (
        <p className="rounded bg-amber-50 p-3 text-sm text-amber-900">
          Aún no has marcado tu zona de alertas.{' '}
          <Link to="/perfil" className="underline">
            Configúrala en tu perfil
          </Link>{' '}
          para enterarte de las mascotas perdidas cerca.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Link to="/avisos" className="rounded bg-black px-4 py-2 text-sm text-white">
          Ver avisos cerca
        </Link>
        <Link to="/avisos/nuevo" className="rounded border border-gray-300 px-4 py-2 text-sm">
          Publicar aviso
        </Link>
      </div>
    </section>
  )
}
