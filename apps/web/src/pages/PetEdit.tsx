import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { PetForm } from '../components/PetForm'
import { api } from '../lib/api'
import type { Pet } from '../lib/pets'
import { removeImage } from '../lib/storage'

export function PetEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [pet, setPet] = useState<Pet | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  if (error) return <p className="text-red-600">{error}</p>
  if (!pet) return <p>Cargando…</p>

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Editar a {pet.name}</h1>
      <PetForm
        initial={pet}
        submitLabel="Guardar cambios"
        onSubmit={async (data) => {
          await api<Pet>(`/pets/${pet.id}`, { method: 'PATCH', body: JSON.stringify(data) })
          if (pet.photoUrl && pet.photoUrl !== data.photoUrl) await removeImage(pet.photoUrl)
          navigate(`/mascotas/${pet.id}`)
        }}
      />
    </section>
  )
}
