import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { AuthCard, AuthLink } from '../components/AuthCard'
import { ErrorText, Field } from '../components/Field'
import { LegalLinks, SignUpNotice } from '../components/Legal'
import { OAuthButtons } from '../components/OAuthButtons'
import { Button } from '../components/ui/Button'
import { UsernameField } from '../components/UsernameField'
import { api, ApiError } from '../lib/api'
import { signUpErrorMessage } from '../lib/authErrors'
import { usernameProblem } from '../lib/username'
import { supabase } from '../lib/supabase'

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
        <p className="mt-3 text-sm font-semibold text-muted">
          ¿No llega en unos minutos? Mira en spam. Si ya tenías cuenta con este email no te llegará nada:{' '}
          <AuthLink to="/recuperar">recupera la contraseña</AuthLink>.
        </p>
      </AuthCard>
    )
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const email = String(form.get('email'))
    const username = String(form.get('username'))
    // El campo ya bloquea el envío, pero por si el navegador no valida (o se salta con novalidate).
    const problem = usernameProblem(username)
    if (problem) return setError(problem)
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
        setError(signUpErrorMessage(error))
        return
      }
      // Sin sesión = el proyecto exige confirmar el email. Si el email ya tenía cuenta, Supabase responde
      // igual pero no envía nada (así nadie puede averiguar qué emails están registrados): lo avisa la pantalla.
      if (!data.session) setSentTo(email)
    } catch (e) {
      // Nuestra API ya responde en español; un fallo de red ("Failed to fetch") no.
      setError(e instanceof ApiError ? e.message : 'No hemos podido conectar. Revisa tu conexión e inténtalo de nuevo.')
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
          <LegalLinks className="flex justify-center pt-2 lg:hidden" />
        </>
      }
    >
      <OAuthButtons next="/avisos" />
      <form onSubmit={handleSubmit} className="space-y-4">
        <UsernameField />
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
        {/* Vale también para el botón de Google de arriba: la cuenta se crea igual. */}
        <SignUpNotice action="crear la cuenta, con email o con Google," />
      </form>
    </AuthCard>
  )
}
