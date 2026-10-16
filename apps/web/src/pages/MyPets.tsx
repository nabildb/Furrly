import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { PetCard } from '../components/PetCard'
import { api } from '../lib/api'
import type { Pet } from '../lib/pets'

export function MyPets() {
  const [pets, setPets] = useState<Pet[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<Pet[]>('/me/pets')
      .then(setPets)
      .catch((e: Error) => setError(e.message))
  }, [])

  if (error) return <p className="text-red-600">{error}</p>
  if (!pets) return <p>Cargando…</p>

  return (
    <section className="mx-auto max-w-2xl space-y-4 px-4 pt-6 pb-32">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Mis mascotas</h1>
        <Link to="/mascotas/nueva" className="rounded bg-black px-3 py-1.5 text-sm text-white">
          Añadir mascota
        </Link>
      </div>
      {pets.length === 0 ? (
        <p className="text-gray-600">Aún no has añadido ninguna mascota.</p>
      ) : (
        <div className="space-y-2">
          {pets.map((pet) => (
            <PetCard key={pet.id} pet={pet} />
          ))}
        </div>
      )}
    </section>
  )
}
