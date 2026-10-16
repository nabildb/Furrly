import { Link } from 'react-router'
import { formatAge, sexLabels, speciesLabels, type Pet } from '../lib/pets'
import { PawIcon, ShieldIcon } from './ui/icons'

interface PetCarnetProps {
  pet: Pet
  /** En la ficha pública se enseña de quién es; en "Mis mascotas" sobra. */
  showOwner?: boolean
}

/** Tarjeta "CARNET FURRLY": oscura, con el círculo naranja decorativo del diseño C. */
export function PetCarnet({ pet, showOwner }: PetCarnetProps) {
  const lines = [
    [pet.breed ?? speciesLabels[pet.species], pet.sex !== 'unknown' && sexLabels[pet.sex]],
    [formatAge(pet.birthDate), pet.color],
  ].map((parts) => parts.filter(Boolean).join(' · '))

  return (
    <article className="relative overflow-hidden rounded-[28px] bg-ink p-5 text-white">
      <div aria-hidden="true" className="absolute -top-[50px] -right-[50px] h-[190px] w-[190px] rounded-full bg-lost opacity-90" />
      <div className="relative flex items-center justify-between">
        <span className="text-xs font-extrabold tracking-[2px]">CARNET FURRLY</span>
        <PawIcon size={26} />
      </div>
      <div className="relative mt-4 flex items-center gap-4">
        <div className="flex h-[124px] w-[104px] flex-none items-center justify-center overflow-hidden rounded-[22px] border-4 border-white bg-[#F6D9C8] text-lost/40">
          {pet.photoUrl ? (
            <img src={pet.photoUrl} alt={`Foto de ${pet.name}`} className="h-full w-full object-cover" />
          ) : (
            <PawIcon size={40} />
          )}
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-[32px] leading-none font-extrabold tracking-[-1px] break-words">{pet.name}</h1>
          {lines.map(
            (line) =>
              line && (
                <p key={line} className="mt-1.5 text-[15px] font-bold text-[#D9DDE3]">
                  {line}
                </p>
              ),
          )}
          {showOwner && (
            <p className="mt-1.5 text-sm font-bold text-[#D9DDE3]">
              de{' '}
              <Link to={`/u/${pet.owner.username}`} className="text-white underline-offset-2 hover:underline">
                @{pet.owner.username}
              </Link>
            </p>
          )}
        </div>
      </div>
      {/* El microchip solo llega de la API cuando quien pide es el dueño. */}
      {pet.microchip && (
        <div className="relative mt-4 flex items-center gap-2 rounded-[14px] bg-white/10 px-3 py-2.5">
          <ShieldIcon size={18} />
          <span className="text-sm font-bold">Microchip registrado · solo lo ves tú</span>
        </div>
      )}
    </article>
  )
}
