import { Component, type ReactNode } from 'react'
import { reportError } from '../lib/sentry'
import { Button } from './ui/Button'
import { LogoMark } from './ui/Logo'
import { buttonClass } from './ui/styles'

/**
 * Sin esto, un error al pintar deja la pantalla en blanco: React desmonta toda la app y
 * no queda nada a lo que volver. Los enlaces recargan de verdad para empezar desde cero.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    reportError(error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main role="alert" className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-3 px-4 text-center">
        <LogoMark size={72} />
        <h1 className="mt-3 font-display text-[28px] leading-tight font-extrabold tracking-[-0.8px]">No hemos podido abrir esta pantalla</h1>
        <p className="max-w-xs text-[15px] font-semibold text-muted">
          Recarga la página. Si sigue igual, revisa tu conexión o vuelve a intentarlo en un rato.
        </p>
        <Button variant="dark" className="mt-3" onClick={() => window.location.reload()}>
          Recargar
        </Button>
        <a href="/avisos" className={buttonClass('secondary')}>
          Volver al mapa
        </a>
      </main>
    )
  }
}
