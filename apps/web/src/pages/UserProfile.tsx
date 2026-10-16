import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { Avatar } from '../components/Avatar'
import { PetCard } from '../components/PetCard'
import { api } from '../lib/api'
import type { Pet } from '../lib/pets'
import type { PublicProfile } from '../lib/users'

export function UserProfile() {
  const { username } = useParams()
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [pets, setPets] = useState<Pet[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([api<PublicProfile>(`/users/${username}`), api<Pet[]>(`/users/${username}/pets`)])
      .then(([p, petList]) => {
        setProfile(p)
        setPets(petList)
      })
      .catch((e: Error) => setError(e.message))
  }, [username])

  if (error) return <p className="text-red-600">{error}</p>
  if (!profile) return <p>Cargando…</p>

  const since = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(new Date(profile.createdAt))

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar url={profile.avatarUrl} name={profile.displayName} className="h-20 w-20 text-3xl" />
        <div>
          <h1 className="text-2xl font-semibold">{profile.displayName}</h1>
          <p className="text-sm text-gray-600">
            @{profile.username} · en Furrly desde {since}
          </p>
        </div>
      </div>
      {profile.bio && <p className="whitespace-pre-line">{profile.bio}</p>}

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Mascotas ({profile.petsCount})</h2>
        {pets.length === 0 ? (
          <p className="text-gray-600">Todavía no ha añadido mascotas.</p>
        ) : (
          pets.map((pet) => <PetCard key={pet.id} pet={pet} />)
        )}
      </div>
    </section>
  )
}
