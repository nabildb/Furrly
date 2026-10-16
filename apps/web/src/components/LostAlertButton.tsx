import type { Pet } from '../lib/pets'
import { ButtonLink } from './ui/Button'
import { AlertIcon, EyeIcon } from './ui/icons'

/** "Avisar de que se ha perdido" o, si ya hay un aviso activo, el enlace a él. */
export function LostAlertButton({ pet, activeReportId }: { pet: Pet; activeReportId?: string }) {
  if (activeReportId) {
    return (
      <ButtonLink to={`/avisos/${activeReportId}`} variant="primary" className="h-[60px] w-full">
        <EyeIcon /> Ver su aviso de pérdida
      </ButtonLink>
    )
  }
  return (
    <ButtonLink to={`/avisos/nuevo?mascota=${pet.id}`} variant="outline" className="h-[60px] w-full">
      <AlertIcon /> Avisar de que se ha perdido
    </ButtonLink>
  )
}
