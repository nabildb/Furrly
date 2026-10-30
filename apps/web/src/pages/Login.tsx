import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { AuthCard, AuthLink } from '../components/AuthCard'
import { ErrorText, Field } from '../components/Field'
import { LegalLinks } from '../components/Legal'
import { OAuthButtons } from '../components/OAuthButtons'
import { Button } from '../components/ui/Button'
import { signInErrorMessage } from '../lib/authErrors'
import { safeRedirect } from '../lib/redirect'
import { supabase } from '../lib/supabase'

export function Login() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  // Si RequireAuth nos ha mandado aquí, al entrar volvemos a esa página. Al volver de Google/Apple llega en ?next=.
  const from = safeRedirect((useLocation().state as { from?: unknown } | null)?.from ?? params.get('next'))
  // Si se cancela o falla en Google/Apple, Supabase vuelve con ?error_description=.
  const [error, setError] = useState<string | null>(
    params.get('error_description') ? 'No se ha podido entrar con esa cuenta. Inténtalo de nuevo.' : null,
  )
  const [submitting, setSubmitting] = useState(false)

  if (session) return <Navigate to={from} replace />

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setSubmitting(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get('email')),
      password: String(form.get('password')),
    })
    setSubmitting(false)
    if (error) {
      setError(signInErrorMessage(error))
      return
    }
    navigate(from, { replace: true })
  }

  return (
    <AuthCard
      title="Entrar"
      subtitle="Para publicar avisos y avisar si ves a alguna mascota."
      footer={
        <>
          <p>
            ¿No tienes cuenta? <AuthLink to="/registro">Crea una</AuthLink>
          </p>
          <LegalLinks className="flex justify-center pt-2 lg:hidden" />
        </>
      }
    >
      <OAuthButtons next={from} />
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <Field label="Contraseña" name="password" type="password" autoComplete="current-password" required />
        <p className="text-right text-sm">
          <AuthLink to="/recuperar">¿Has olvidado tu contraseña?</AuthLink>
        </p>
        {error && <ErrorText>{error}</ErrorText>}
        <Button type="submit" variant="dark" disabled={submitting} className="w-full">
          {submitting ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
    </AuthCard>
  )
}
