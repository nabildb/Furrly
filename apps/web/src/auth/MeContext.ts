import { createContext } from 'react'

/** Quién soy, para la navegación y para saber qué es mío (editar, borrar...). */
export interface MeState {
  username: string | null
  displayName: string | null
  /** Moderador: solo decide qué botones se ven; quien de verdad lo comprueba es la API. */
  isAdmin: boolean
  /** Tras guardar el perfil o elegir el username: que la barra lateral y el resto lo vean al momento. */
  update: (changes: { username?: string; displayName?: string }) => void
}

export const MeContext = createContext<MeState>({ username: null, displayName: null, isAdmin: false, update: () => {} })
