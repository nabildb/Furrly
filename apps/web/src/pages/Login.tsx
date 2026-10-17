import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { AuthCard, AuthLink } from '../components/AuthCard'
import { ErrorText, Field } from '../components/Field'
import { Button } from '../components/ui/Button'
import { safeRedirect } from '../lib/redirect'
import { supabase } from '../lib/supabase'

export function Login() {
  const { session } = useAuth()
  const navigate = useNavigate()
  // Si RequireAuth nos ha mandado aquí, al entrar volvemos a esa página.
  const from = safeRedirect((useLocation().state as { from?: unknown } | null)?.from)
  const [error, setError] = useState<string | null>(null)
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
      setError(error.code === 'email_not_confirmed' ? 'Confirma tu email antes de entrar.' : 'Email o contraseña incorrectos.')
      return
    }
    navigate(from, { replace: true })
  }

  return (
    <AuthCard
      title="Entrar"
      subtitle="Para publicar avisos y avisar si ves a alguna mascota."
      footer={
        <p>
          ¿No tienes cuenta? <AuthLink to="/registro">Crea una</AuthLink>
        </p>
      }
    >
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
