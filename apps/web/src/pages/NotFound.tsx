import { ButtonLink } from '../components/ui/Button'
import { MapIcon } from '../components/ui/icons'
import { LogoMark } from '../components/ui/Logo'
import { useDocumentTitle } from '../lib/useDocumentTitle'

export function NotFound() {
  useDocumentTitle('Página no encontrada')

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-3 px-4 pb-32 text-center">
      <LogoMark size={72} />
      <h1 className="mt-3 font-display text-[28px] leading-tight font-extrabold tracking-[-0.8px]">Por aquí no hay nadie</h1>
      <p className="max-w-xs text-[15px] font-semibold text-muted">
        La página que buscas no existe o se ha movido. Quizá se ha escapado, como algunas mascotas.
      </p>
      <ButtonLink to="/avisos" variant="dark" className="mt-3">
        <MapIcon /> Volver al mapa
      </ButtonLink>
    </main>
  )
}
