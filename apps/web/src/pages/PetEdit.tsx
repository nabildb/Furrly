import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ErrorText } from '../components/Field'
import { Loading, Page, PageError } from '../components/Page'
import { PetForm } from '../components/PetForm'
import { Button } from '../components/ui/Button'
import { api } from '../lib/api'
import type { Pet } from '../lib/pets'
import type { PostsPage } from '../lib/posts'
import { removeImage } from '../lib/storage'

/** Todas las fotos publicadas de la mascota (recorriendo las páginas del cursor). */
async function allPostImages(petId: string) {
  const urls: string[] = []
  let cursor: string | null = null
  do {
    const page: PostsPage = await api<PostsPage>(`/pets/${petId}/posts${cursor ? `?cursor=${cursor}` : ''}`)
    urls.push(...page.posts.map((p) => p.imageUrl))
    cursor = page.nextCursor
  } while (cursor)
  return urls
}

export function PetEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [pet, setPet] = useState<Pet | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    // /me/pets incluye el microchip, que la ficha pública no devuelve.
    api<Pet[]>('/me/pets')
      .then((pets) => {
        const found = pets.find((p) => p.id === id)
        if (found) setPet(found)
        else setError('Mascota no encontrada')
      })
      .catch((e: Error) => setError(e.message))
  }, [id])

  if (error) return <PageError message={error} back="/mascotas" />
  if (!pet) return <Loading />

  async function handleDelete() {
    if (!pet || !confirm(`¿Seguro que quieres borrar a ${pet.name}? También se borrarán sus avisos. No se puede deshacer.`)) return
    try {
      // La BD borra en cascada sus publicaciones, pero las fotos viven en Storage:
      // apuntamos sus URLs antes de borrar para no dejarlas huérfanas.
      const postImages = await allPostImages(pet.id)
      await api(`/pets/${pet.id}`, { method: 'DELETE' })
      await Promise.all([pet.photoUrl, ...postImages].filter((url): url is string => !!url).map(removeImage))
      navigate('/mascotas', { replace: true })
    } catch (e) {
      setDeleteError((e as Error).message)
    }
  }

  return (
    <Page title={`Editar a ${pet.name}`} back={`/mascotas?m=${pet.id}`} bottomSpace={false} className="pb-12">
      <PetForm
        initial={pet}
        submitLabel="Guardar cambios"
        onSubmit={async (data) => {
          await api<Pet>(`/pets/${pet.id}`, { method: 'PATCH', body: JSON.stringify(data) })
          if (pet.photoUrl && pet.photoUrl !== data.photoUrl) await removeImage(pet.photoUrl)
          navigate(`/mascotas?m=${pet.id}`, { replace: true })
        }}
      />
      <div className="mt-8 space-y-3 border-t border-line pt-6">
        {deleteError && <ErrorText>{deleteError}</ErrorText>}
        <Button variant="danger" size="md" onClick={handleDelete} className="w-full">
          Borrar a {pet.name}
        </Button>
      </div>
    </Page>
  )
}
