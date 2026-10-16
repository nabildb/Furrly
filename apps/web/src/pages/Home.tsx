import { useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { api } from '../lib/api'

interface Me {
  id: string
  username: string
  displayName: string
  alertRadiusKm: number
}

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
    return <p className="text-gray-600">Mascotas perdidas y encontradas cerca de ti. Entra o crea una cuenta.</p>
  }

  if (error) return <p className="text-red-600">{error}</p>
  if (!me) return <p>Cargando perfil…</p>

  return (
    <section>
      <h1 className="text-xl font-semibold">Hola, {me.displayName}</h1>
      <p className="text-gray-600">@{me.username} · radio de alertas: {me.alertRadiusKm} km</p>
    </section>
  )
}
