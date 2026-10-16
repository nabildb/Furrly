import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { Loading, Page, PageError } from '../components/Page'
import { LostAlertButton } from '../components/LostAlertButton'
import { FollowButton, PetStats } from '../components/FollowButton'
import { PetCarnet } from '../components/PetCarnet'
import { PetPostsGrid } from '../components/PetPostsGrid'
import { ButtonLink } from '../components/ui/Button'
import { Card, SectionTitle } from '../components/ui/Card'
import { CameraIcon, EditIcon } from '../components/ui/icons'
import { iconButtonClass } from '../components/ui/styles'
import { api } from '../lib/api'
import type { Pet } from '../lib/pets'
import { useActiveLostReports } from '../lib/useActiveLostReports'

/** Carnet público de una mascota (/mascotas/:id). */
export function PetDetail() {
  const { id } = useParams()
  const { session } = useAuth()
  const [pet, setPet] = useState<Pet | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<Pet>(`/pets/${id}`)
      .then(setPet)
      .catch((e: Error) => setError(e.message))
  }, [id])

  // Solo decide si se muestran los botones: quien de verdad lo comprueba es la API.
  const isOwner = !!pet && session?.user.user_metadata.username === pet.owner.username
  const activeLost = useActiveLostReports(isOwner)

  if (error) return <PageError message={error} />
  if (!pet) return <Loading />

  return (
    <Page
      title={pet.name}
      width="wide"
      back={`/u/${pet.owner.username}`}
      action={
        isOwner ? (
          <Link to={`/mascotas/${pet.id}/editar`} aria-label={`Editar a ${pet.name}`} className={iconButtonClass()}>
            <EditIcon size={20} />
          </Link>
        ) : undefined
      }
    >
      <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start lg:gap-6 lg:space-y-0">
        <PetCarnet pet={pet} showOwner />
        <div className="space-y-4">
          <PetStats followersCount={pet.followersCount ?? 0} postsCount={pet.postsCount ?? 0} />
          {isOwner ? (
            <ButtonLink to={`/publicaciones/nueva?mascota=${pet.id}`} variant="dark" className="w-full">
              <CameraIcon /> Publicar foto de {pet.name}
            </ButtonLink>
          ) : (
            <FollowButton
              petId={pet.id}
              followedByMe={pet.followedByMe ?? false}
              onChange={(stats) => setPet({ ...pet, ...stats })}
            />
          )}
          {pet.description && (
            <Card>
              <SectionTitle className="mb-1.5 text-[15px]">Cómo es</SectionTitle>
              <p className="text-[15px] leading-relaxed whitespace-pre-line text-body">{pet.description}</p>
            </Card>
          )}
          {isOwner && <LostAlertButton pet={pet} activeReportId={activeLost?.get(pet.id)} />}
        </div>
      </div>
      <div className="mt-8">
        <PetPostsGrid key={pet.id} petId={pet.id} petName={pet.name} />
      </div>
    </Page>
  )
}
