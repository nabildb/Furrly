import type { Session } from '@supabase/supabase-js'
import { createContext } from 'react'

export interface AuthState {
  session: Session | null
  /** true hasta que Supabase recupera la sesión guardada al cargar la página. */
  loading: boolean
}

export const AuthContext = createContext<AuthState>({ session: null, loading: true })
