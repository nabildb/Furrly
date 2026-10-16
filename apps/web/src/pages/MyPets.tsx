import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ErrorText } from '../components/Field'
import { Loading, Page } from '../components/Page'
import { LostAlertButton } from '../components/LostAlertButton'
import { PetCarnet } from '../components/PetCarnet'
import { PetPostsGrid } from '../components/PetPostsGrid'
import { ButtonLink } from '../components/ui/Button'
import { Card, SectionTitle } from '../components/ui/Card'
import { Chip } from '../components/ui/Chip'
import { CameraIcon, EditIcon, PawIcon, PlusIcon } from '../components/ui/icons'
import { iconButtonClass } from '../components/ui/styles'
import { api } from '../lib/api'
import type { Pet } from '../lib/pets'
import { useActiveLostReports } from '../lib/useActiveLostReports'

/** "Mis mascotas": selector en chips y el carnet de la elegida (?m=<id> para poder enlazarla). */
export function MyPets() {
  const [pets, setPets] = useState<Pet[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [params, setParams] = useSearchParams()
  const activeLost = useActiveLostReports()

  useEffect(() => {
    api<Pet[]>('/me/pets')
      .then(setPets)
      .catch((e: Error) => setError(e.message))
  }, [])

  if (error) {
    return (
      <Page title="Mis mascotas">
        <ErrorText>{error}</ErrorText>
      </Page>
    )
  }
  if (!pets) return <Loading />

  if (pets.length === 0) {
    return (
      <Page title="Mis mascotas">
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-lost-soft text-lost">
            <PawIcon size={34} />
          </span>
          <SectionTitle>Aún no has añadido ninguna mascota</SectionTitle>
          <p className="max-w-xs text-[15px] font-semibold text-muted">
            Con su carnet listo, si algún día se pierde podrás avisar en un minuto.
          </p>
          <ButtonLink to="/mascotas/nueva" className="mt-2">
            <PlusIcon /> Añadir mascota
          </ButtonLink>
        </Card>
      </Page>
    )
  }

  const pet = pets.find((p) => p.id === params.get('m')) ?? pets[0]

  return (
    <Page
      title="Mis mascotas"
      variant="sub"
      width="wide"
      action={
        <Link to={`/mascotas/${pet.id}/editar`} aria-label={`Editar a ${pet.name}`} className={iconButtonClass()}>
          <EditIcon size={20} />
        </Link>
      }
    >
      <div role="toolbar" aria-label="Elegir mascota" className="-mx-4 mb-[18px] flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
        {pets.map((p) => (
          <Chip key={p.id} active={p.id === pet.id} onClick={() => setParams({ m: p.id }, { replace: true })} className="h-10 px-4">
            {p.name}
          </Chip>
        ))}
        <Link
          to="/mascotas/nueva"
          aria-label="Añadir mascota"
          className="flex h-10 w-10 flex-none items-center justify-center rounded-full border-2 border-dashed border-[#C9C5BB] text-muted transition hover:border-ink hover:text-ink"
        >
          <PlusIcon size={18} />
        </Link>
      </div>

      <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start lg:gap-6 lg:space-y-0">
        <PetCarnet pet={pet} />
        <div className="space-y-4">
          {pet.description && (
            <Card>
              <SectionTitle className="mb-1.5 text-[15px]">Cómo es</SectionTitle>
              <p className="text-[15px] leading-relaxed whitespace-pre-line text-body">{pet.description}</p>
            </Card>
          )}

          <ButtonLink to={`/publicaciones/nueva?mascota=${pet.id}`} variant="dark" className="w-full">
            <CameraIcon /> Publicar foto de {pet.name}
          </ButtonLink>
          <LostAlertButton pet={pet} activeReportId={activeLost?.get(pet.id)} />
          <Link
            to={`/mascotas/${pet.id}`}
            className="block text-center text-sm font-extrabold text-muted underline-offset-2 hover:text-ink hover:underline"
          >
            Ver su carnet público
          </Link>
        </div>
      </div>
      <div className="mt-8">
        <PetPostsGrid key={pet.id} petId={pet.id} petName={pet.name} />
      </div>
    </Page>
  )
}
