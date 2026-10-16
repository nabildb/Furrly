import { useNavigate } from 'react-router'
import { Page } from '../components/Page'
import { PetForm } from '../components/PetForm'
import { api } from '../lib/api'
import type { Pet } from '../lib/pets'

export function PetNew() {
  const navigate = useNavigate()

  return (
    <Page title="Nueva mascota" back="/mascotas" bottomSpace={false} className="pb-12">
      <PetForm
        submitLabel="Crear carnet"
        onSubmit={async (data) => {
          const pet = await api<Pet>('/pets', { method: 'POST', body: JSON.stringify(data) })
          navigate(`/mascotas?m=${pet.id}`, { replace: true })
        }}
      />
    </Page>
  )
}
