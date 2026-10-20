import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { AuthCard } from '../components/AuthCard'
import { ErrorText, Field } from '../components/Field'
import { Loading } from '../components/Page'
import { Button } from '../components/ui/Button'
import { UsernameField } from '../components/UsernameField'
import { api } from '../lib/api'
import { safeRedirect } from '../lib/redirect'
import type { Me } from '../lib/users'

/**
 * Primera vez con Google/Apple: la cuenta tiene un username provisional sacado del email.
 * Aquí se confirma o se cambia (solo una vez) y se ajusta el nombre visible.
 */
export function Welcome() {
  const navigate = useNavigate()
  const next = safeRedirect(useSearchParams()[0].get('next'))
  const [me, setMe] = useState<Me | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api<Me>('/me')
      .then(setMe)
      .catch((e: Error) => setError(e.message))
  }, [])

  if (error && !me) return <ErrorText>{error}</ErrorText>
  if (!me) return <Loading />
  if (me.usernameConfirmed) return <Navigate to={next} replace />

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setSubmitting(true)
    setError(null)
    try {
      const updated = await api<Me>('/me/username', {
        method: 'PUT',
        body: JSON.stringify({ username: String(form.get('username')).toLowerCase(), displayName: form.get('displayName') }),
      })
      // Cuenta nueva: después del nombre, la guía de primeros pasos.
      navigate(updated.onboardingDone ? next : `/empezar?next=${encodeURIComponent(next)}`, { replace: true })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthCard title="Te damos la bienvenida" subtitle="Elige cómo te verán los vecinos en Furrly.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <UsernameField
          defaultValue={me.username}
          hint="3-30 caracteres: minúsculas, números o _. Después no se podrá cambiar."
        />
        <Field label="Nombre visible" name="displayName" defaultValue={me.displayName} required maxLength={60} autoComplete="name" />
        {error && <ErrorText>{error}</ErrorText>}
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Guardando…' : 'Empezar'}
        </Button>
      </form>
    </AuthCard>
  )
}
