import { useNavigate } from 'react-router'
import { PetForm } from '../components/PetForm'
import { api } from '../lib/api'
import type { Pet } from '../lib/pets'

export function PetNew() {
  const navigate = useNavigate()

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Nueva mascota</h1>
      <PetForm
        submitLabel="Crear mascota"
        onSubmit={async (data) => {
          const pet = await api<Pet>('/pets', { method: 'POST', body: JSON.stringify(data) })
          navigate(`/mascotas/${pet.id}`)
        }}
      />
    </section>
  )
}
