import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { api } from '../lib/api'
import { formatAge, sexLabels, speciesLabels, type Pet } from '../lib/pets'
import { removeImage } from '../lib/storage'

export function PetDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const [pet, setPet] = useState<Pet | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<Pet>(`/pets/${id}`)
      .then(setPet)
      .catch((e: Error) => setError(e.message))
  }, [id])

  if (error) return <p className="text-red-600">{error}</p>
  if (!pet) return <p>Cargando…</p>

  // Solo decide si se muestran los botones: quien de verdad lo comprueba es la API.
  const isOwner = session?.user.user_metadata.username === pet.owner.username

  async function handleDelete() {
    if (!pet || !confirm(`¿Seguro que quieres borrar a ${pet.name}? También se borrarán sus avisos. No se puede deshacer.`)) return
    try {
      await api(`/pets/${pet.id}`, { method: 'DELETE' })
      if (pet.photoUrl) await removeImage(pet.photoUrl)
      navigate('/mascotas')
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const details = [
    ['Especie', speciesLabels[pet.species]],
    ['Raza', pet.breed],
    ['Sexo', sexLabels[pet.sex]],
    ['Edad', formatAge(pet.birthDate)],
    ['Color', pet.color],
  ].filter(([, value]) => value)

  return (
    <article className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="h-28 w-28 overflow-hidden rounded-full bg-gray-100">
          {pet.photoUrl && <img src={pet.photoUrl} alt={pet.name} className="h-full w-full object-cover" />}
        </div>
        <div>
          <h1 className="text-2xl font-semibold">{pet.name}</h1>
          <p className="text-sm text-gray-600">
            de{' '}
            <Link to={`/u/${pet.owner.username}`} className="underline">
              @{pet.owner.username}
            </Link>
          </p>
        </div>
      </div>

      {pet.description && <p>{pet.description}</p>}

      <dl className="grid grid-cols-2 gap-2 text-sm">
        {details.map(([label, value]) => (
          <div key={label}>
            <dt className="text-gray-500">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      {isOwner && (
        <div className="flex gap-4 text-sm">
          <Link to={`/mascotas/${pet.id}/editar`} className="underline">
            Editar
          </Link>
          <button onClick={handleDelete} className="text-red-600 underline">
            Borrar
          </button>
        </div>
      )}
    </article>
  )
}
