import { useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { api } from '../lib/api'
import { Button, ButtonLink } from './ui/Button'
import { CheckIcon, PlusIcon } from './ui/icons'

export interface FollowStats {
  followersCount: number
  postsCount: number
  followedByMe: boolean
}

interface FollowButtonProps {
  petId: string
  followedByMe: boolean
  onChange: (stats: FollowStats) => void
}

/** Seguir / Siguiendo. Sin sesión lleva al login y vuelve al carnet. */
export function FollowButton({ petId, followedByMe, onChange }: FollowButtonProps) {
  const { session } = useAuth()
  const [pending, setPending] = useState(false)

  if (!session) {
    return (
      <ButtonLink to="/login" state={{ from: `/mascotas/${petId}` }} variant="dark" className="w-full">
        <PlusIcon /> Seguir
      </ButtonLink>
    )
  }

  async function toggle() {
    setPending(true)
    try {
      onChange(await api<FollowStats>(`/pets/${petId}/follow`, { method: followedByMe ? 'DELETE' : 'PUT' }))
    } finally {
      setPending(false)
    }
  }

  return (
    <Button
      variant={followedByMe ? 'secondary' : 'dark'}
      onClick={toggle}
      disabled={pending}
      aria-pressed={followedByMe}
      className="w-full"
    >
      {followedByMe ? (
        <>
          <CheckIcon /> Siguiendo
        </>
      ) : (
        <>
          <PlusIcon /> Seguir
        </>
      )}
    </Button>
  )
}

/** "12 seguidores · 4 publicaciones" */
export function PetStats({ followersCount, postsCount }: Pick<FollowStats, 'followersCount' | 'postsCount'>) {
  const items = [
    [followersCount, followersCount === 1 ? 'seguidor' : 'seguidores'],
    [postsCount, postsCount === 1 ? 'publicación' : 'publicaciones'],
  ] as const
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {items.map(([n, label]) => (
        <div key={label} className="rounded-2xl border border-card-line bg-surface px-4 py-3">
          <span className="block font-display text-xl font-extrabold">{n}</span>
          <span className="text-sm font-semibold text-muted">{label}</span>
        </div>
      ))}
    </div>
  )
}
