import { useEffect, useState, type JSX } from 'react'
import { enabledProviders, signInWith, type OAuthProvider } from '../lib/oauth'
import { ErrorText } from './Field'
import { Button } from './ui/Button'

function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true" className="flex-none">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

function AppleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" className="flex-none" fill="currentColor">
      <path d="M16.37 12.62c-.03-2.6 2.13-3.86 2.22-3.92-1.21-1.77-3.09-2.01-3.76-2.04-1.6-.16-3.12.94-3.93.94-.81 0-2.06-.92-3.39-.89-1.74.03-3.35 1.01-4.25 2.57-1.81 3.14-.46 7.79 1.3 10.34.86 1.25 1.89 2.65 3.23 2.6 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.38.81 1.4-.03 2.28-1.27 3.13-2.53.99-1.45 1.4-2.85 1.42-2.92-.03-.01-2.72-1.04-2.75-4.13zM13.79 4.98c.71-.87 1.2-2.07 1.06-3.27-1.03.04-2.28.69-3.02 1.55-.66.76-1.24 1.99-1.08 3.16 1.15.09 2.32-.58 3.04-1.44z" />
    </svg>
  )
}

const labels: Record<OAuthProvider, { text: string; logo: () => JSX.Element }> = {
  google: { text: 'Continuar con Google', logo: GoogleLogo },
  apple: { text: 'Continuar con Apple', logo: AppleLogo },
}

/** "Continuar con Google/Apple" encima del formulario de email. Si no hay ninguno activado, no se muestra nada. */
export function OAuthButtons({ next }: { next: string }) {
  const [providers, setProviders] = useState<OAuthProvider[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    enabledProviders().then(setProviders)
  }, [])

  if (providers.length === 0) return null

  async function start(provider: OAuthProvider) {
    setError(null)
    try {
      await signInWith(provider, next)
    } catch {
      setError('No se ha podido conectar. Inténtalo de nuevo.')
    }
  }

  return (
    <div className="mb-5 space-y-2.5">
      {providers.map((p) => {
        const { text, logo: Logo } = labels[p]
        return (
          <Button key={p} variant="secondary" size="md" onClick={() => start(p)} className="w-full">
            <Logo />
            {text}
          </Button>
        )
      })}
      {error && <ErrorText>{error}</ErrorText>}
      <p className="flex items-center gap-3 pt-2 text-sm font-semibold text-muted before:h-px before:flex-1 before:bg-card-line after:h-px after:flex-1 after:bg-card-line">
        o con tu email
      </p>
    </div>
  )
}
