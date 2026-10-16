import { Link } from 'react-router'
import { formatAge, speciesLabels, type Pet } from '../lib/pets'

export function PetCard({ pet }: { pet: Pet }) {
  const age = formatAge(pet.birthDate)
  return (
    <Link to={`/mascotas/${pet.id}`} className="flex items-center gap-4 rounded border border-gray-200 p-3 hover:bg-gray-50">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-gray-100">
        {pet.photoUrl && <img src={pet.photoUrl} alt="" className="h-full w-full object-cover" />}
      </div>
      <div>
        <p className="font-medium">{pet.name}</p>
        <p className="text-sm text-gray-600">
          {[speciesLabels[pet.species], pet.breed, age].filter(Boolean).join(' · ')}
        </p>
      </div>
    </Link>
  )
}
