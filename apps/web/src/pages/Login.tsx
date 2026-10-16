import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { Field } from '../components/Field'
import { supabase } from '../lib/supabase'

export function Login() {
  const { session } = useAuth()
  const navigate = useNavigate()
  // Si RequireAuth nos ha mandado aquí, al entrar volvemos a esa página.
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/avisos'
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
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-4 px-4 pt-6 pb-32">
      <h1 className="text-xl font-semibold">Entrar</h1>
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field label="Contraseña" name="password" type="password" autoComplete="current-password" required />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={submitting} className="rounded bg-black px-4 py-2 text-white disabled:opacity-50">
        {submitting ? 'Entrando…' : 'Entrar'}
      </button>
      <p className="text-sm">
        <Link to="/recuperar" className="underline">¿Has olvidado tu contraseña?</Link>
      </p>
      <p className="text-sm">
        ¿No tienes cuenta? <Link to="/registro" className="underline">Crea una</Link>
      </p>
    </form>
  )
}
