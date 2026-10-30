import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { useMe } from '../auth/useMe'
import { Avatar } from '../components/Avatar'
import { BlockButton } from '../components/BlockButton'
import { DeleteProfileButton } from '../components/DeleteProfileButton'
import { FlagButton } from '../components/FlagButton'
import { Loading, Page, PageError } from '../components/Page'
import { PetCard } from '../components/PetCard'
import { SuspendButton } from '../components/SuspendButton'
import { WarnButton } from '../components/WarnButton'
import { ButtonLink } from '../components/ui/Button'
import { SectionTitle } from '../components/ui/Card'
import { MessageIcon } from '../components/ui/icons'
import { api } from '../lib/api'
import type { Pet } from '../lib/pets'
import type { PublicProfile } from '../lib/users'

export function UserProfile() {
  const { username } = useParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const { username: myUsername, isAdmin } = useMe()
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

  const isMe = myUsername === profile.username
  const composeLink = `/mensajes/nuevo?para=${profile.username}`
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
        {!isMe && (
          <div className="mt-2 flex flex-col items-center gap-3">
            <ButtonLink
              to={session ? composeLink : '/login'}
              state={session ? undefined : { from: composeLink }}
              variant="dark"
              size="md"
            >
              <MessageIcon size={20} /> Enviar mensaje
            </ButtonLink>
            <div className="flex items-center gap-4">
              {session && (
                <BlockButton
                  username={profile.username}
                  blockedByMe={profile.blockedByMe}
                  onChange={(blockedByMe) => setProfile({ ...profile, blockedByMe })}
                />
              )}
              {!isAdmin && <FlagButton target={{ targetType: 'user', username: profile.username }} label="Denunciar perfil" />}
            </div>
            {isAdmin && (
              <div className="flex flex-wrap items-center justify-center gap-4">
                <WarnButton key={`warn-${profile.username}`} username={profile.username} />
                <SuspendButton key={profile.username} username={profile.username} />
                <DeleteProfileButton username={profile.username} onDeleted={() => navigate('/comunidad', { replace: true })} />
                <Link to={`/moderacion/usuarios/${profile.username}`} className="text-[13px] font-extrabold text-ink hover:underline">
                  Ver ficha
                </Link>
              </div>
            )}
          </div>
        )}
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
