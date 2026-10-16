export type Species = 'dog' | 'cat' | 'rabbit' | 'bird' | 'other'
export type PetSex = 'male' | 'female' | 'unknown'

export interface Pet {
  id: string
  name: string
  species: Species
  breed: string | null
  sex: PetSex
  birthDate: string | null
  color: string | null
  description: string | null
  photoUrl: string | null
  createdAt: string
  owner: { username: string; displayName: string }
  /** Solo viene cuando quien pide es el dueño. */
  microchip?: string | null
  /** Solo en la ficha (GET /pets/:id). followedByMe es false si no hay sesión. */
  followersCount?: number
  postsCount?: number
  followedByMe?: boolean
}

export type PetInput = Omit<Pet, 'id' | 'createdAt' | 'owner'>

export const speciesLabels: Record<Species, string> = {
  dog: 'Perro',
  cat: 'Gato',
  rabbit: 'Conejo',
  bird: 'Pájaro',
  other: 'Otro',
}

export const sexLabels: Record<PetSex, string> = {
  male: 'Macho',
  female: 'Hembra',
  unknown: 'Desconocido',
}

/** "3 años", "5 meses"... a partir de la fecha de nacimiento (YYYY-MM-DD o ISO). */
export function formatAge(birthDate: string | null) {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  const now = new Date()
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth()
  if (months < 1) return 'menos de un mes'
  if (months < 12) return months === 1 ? '1 mes' : `${months} meses`
  const years = Math.floor(months / 12)
  return years === 1 ? '1 año' : `${years} años`
}
