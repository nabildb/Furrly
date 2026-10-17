import { disablePush } from './push'
import { supabase } from './supabase'

/**
 * Cerrar sesión. Antes se da de baja el push de este dispositivo: si no, seguirían llegando
 * aquí los avisos de una cuenta que ya no está abierta.
 */
export async function signOut() {
  await disablePush().catch(() => {})
  await supabase.auth.signOut()
}
