import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { Avatar } from '../components/Avatar'
import { Loading, Page, PageError } from '../components/Page'
import { PetCard } from '../components/PetCard'
import { SectionTitle } from '../components/ui/Card'
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

  if (error) return <PageError message={error} />
  if (!profile) return <Loading />

  const since = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(new Date(profile.createdAt))
  const stats = [
    [profile.petsCount, profile.petsCount === 1 ? 'mascota' : 'mascotas'],
    [profile.reportsCount, profile.reportsCount === 1 ? 'aviso' : 'avisos'],
  ] as const

  return (
    <Page title={`@${profile.username}`} back="/avisos" width="wide">
      <section className="flex flex-col items-center gap-3 text-center">
        <Avatar url={profile.avatarUrl} name={profile.displayName} className="h-24 w-24 text-4xl" />
        <div>
          <h2 className="font-display text-[26px] leading-tight font-extrabold tracking-[-0.8px]">{profile.displayName}</h2>
          <p className="text-sm font-semibold text-muted">En Furrly desde {since}</p>
        </div>
        {profile.bio && <p className="max-w-md text-[15px] leading-relaxed whitespace-pre-line text-body">{profile.bio}</p>}
        <div className="mt-1 flex gap-2.5">
          {stats.map(([n, label]) => (
            <div key={label} className="rounded-2xl border border-card-line bg-surface px-4 py-2.5">
              <span className="font-display text-lg font-extrabold">{n}</span>{' '}
              <span className="text-sm font-semibold text-muted">{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 space-y-3">
        <SectionTitle>Sus mascotas</SectionTitle>
        {pets.length === 0 ? (
          <p className="text-[15px] font-semibold text-muted">Todavía no ha añadido mascotas.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pets.map((pet) => (
              <PetCard key={pet.id} pet={pet} />
            ))}
          </div>
        )}
      </section>
    </Page>
  )
}
