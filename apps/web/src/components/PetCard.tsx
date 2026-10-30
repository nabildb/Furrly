import { Link } from 'react-router'
import { formatAge, speciesLabels, type Pet } from '../lib/pets'
import { thumbUrl } from '../lib/thumbUrl'
import { PawIcon } from './ui/icons'

/** Mascota en una lista (perfil público): foto, nombre y datos básicos. */
export function PetCard({ pet }: { pet: Pet }) {
  const age = formatAge(pet.birthDate)
  return (
    <Link
      to={`/mascotas/${pet.id}`}
      className="flex items-center gap-3.5 rounded-card border border-card-line bg-surface p-3 transition hover:border-line hover:shadow-chip"
    >
      <div className="flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-2xl bg-[#F6D9C8] text-lost/40">
        {pet.photoUrl ? <img src={thumbUrl(pet.photoUrl)} alt="" className="h-full w-full object-cover" /> : <PawIcon size={28} />}
      </div>
      <div className="min-w-0">
        <p className="truncate font-display text-[17px] font-extrabold">{pet.name}</p>
        <p className="truncate text-sm font-semibold text-muted">
          {[speciesLabels[pet.species], pet.breed, age].filter(Boolean).join(' · ')}
        </p>
      </div>
    </Link>
  )
}
