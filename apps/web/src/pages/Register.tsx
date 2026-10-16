import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { Field } from '../components/Field'
import { api } from '../lib/api'
import { supabase } from '../lib/supabase'

const USERNAME_PATTERN = '[a-z0-9_]{3,30}'

export function Register() {
  const { session } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  if (session) return <Navigate to="/" replace />

  if (sentTo) {
    return (
      <p>
        Te hemos enviado un email a <strong>{sentTo}</strong>. Confírmalo y después{' '}
        <Link to="/login" className="underline">entra</Link>.
      </p>
    )
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const email = String(form.get('email'))
    const username = String(form.get('username')).toLowerCase()
    setSubmitting(true)
    setError(null)

    try {
      // El perfil lo crea un trigger en la BD; si el username está cogido, mejor saberlo antes.
      const { available } = await api<{ available: boolean }>(`/usernames/${encodeURIComponent(username)}/available`)
      if (!available) {
        setError('Ese nombre de usuario ya está cogido.')
        return
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password: String(form.get('password')),
        options: {
          data: { username, display_name: String(form.get('displayName')) },
          emailRedirectTo: window.location.origin,
        },
      })
      if (error) {
        setError(error.message)
        return
      }
      // Sin sesión = el proyecto exige confirmar el email.
      if (!data.session) setSentTo(email)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h1 className="text-xl font-semibold">Crear cuenta</h1>
      <Field
        label="Nombre de usuario"
        name="username"
        required
        pattern={USERNAME_PATTERN}
        autoComplete="username"
        hint="3-30 caracteres: minúsculas, números o _"
      />
      <Field label="Nombre visible" name="displayName" required maxLength={60} autoComplete="name" />
      <Field label="Email" name="email" type="email" required autoComplete="email" />
      <Field label="Contraseña" name="password" type="password" required minLength={8} autoComplete="new-password" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={submitting} className="rounded bg-black px-4 py-2 text-white disabled:opacity-50">
        {submitting ? 'Creando…' : 'Crear cuenta'}
      </button>
      <p className="text-sm">
        ¿Ya tienes cuenta? <Link to="/login" className="underline">Entra</Link>
      </p>
    </form>
  )
}
