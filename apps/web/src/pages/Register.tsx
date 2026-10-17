import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { AuthCard, AuthLink } from '../components/AuthCard'
import { ErrorText, Field } from '../components/Field'
import { OAuthButtons } from '../components/OAuthButtons'
import { Button } from '../components/ui/Button'
import { api } from '../lib/api'
import { supabase } from '../lib/supabase'

const USERNAME_PATTERN = '[a-z0-9_]{3,30}'

export function Register() {
  const { session } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  if (session) return <Navigate to="/avisos" replace />

  if (sentTo) {
    return (
      <AuthCard title="Revisa tu email" footer={<AuthLink to="/login">Ir a entrar</AuthLink>}>
        <p className="text-[15px] leading-relaxed text-body">
          Te hemos enviado un email a <strong className="font-extrabold">{sentTo}</strong>. Confírmalo y después podrás
          entrar.
        </p>
      </AuthCard>
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
    <AuthCard
      title="Crear cuenta"
      subtitle="Únete a los vecinos que ayudan a que vuelvan a casa."
      footer={
        <>
          <p>
            ¿Ya tienes cuenta? <AuthLink to="/login">Entra</AuthLink>
          </p>
          <p className="text-sm">
            <AuthLink to="/privacidad">Privacidad</AuthLink>
          </p>
        </>
      }
    >
      <OAuthButtons next="/avisos" />
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          label="Nombre de usuario"
          name="username"
          required
          pattern={USERNAME_PATTERN}
          autoComplete="username"
          autoCapitalize="none"
          hint="3-30 caracteres: minúsculas, números o _"
        />
        <Field label="Nombre visible" name="displayName" required maxLength={60} autoComplete="name" />
        <Field label="Email" name="email" type="email" required autoComplete="email" />
        <Field
          label="Contraseña"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          hint="Mínimo 8 caracteres."
        />
        {error && <ErrorText>{error}</ErrorText>}
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Creando…' : 'Crear cuenta'}
        </Button>
      </form>
    </AuthCard>
  )
}
