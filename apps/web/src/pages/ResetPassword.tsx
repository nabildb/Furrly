import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { AuthCard, AuthLink } from '../components/AuthCard'
import { ErrorText, Field } from '../components/Field'
import { Loading } from '../components/Page'
import { Button } from '../components/ui/Button'
import { supabase } from '../lib/supabase'

/** Destino del enlace del email: Supabase ya ha abierto una sesión temporal de recuperación. */
export function ResetPassword() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) return <Loading />
  if (!session) {
    return (
      <AuthCard title="Enlace caducado" footer={<AuthLink to="/recuperar">Pide uno nuevo</AuthLink>}>
        <p className="text-[15px] leading-relaxed text-body">El enlace no es válido o ha caducado.</p>
      </AuthCard>
    )
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const password = String(form.get('password'))
    if (password !== form.get('confirm')) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setSubmitting(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    setSubmitting(false)
    if (error) {
      setError(error.code === 'same_password' ? 'La contraseña nueva tiene que ser distinta de la anterior.' : error.message)
      return
    }
    navigate('/avisos')
  }

  return (
    <AuthCard title="Elige una contraseña nueva">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Contraseña nueva" name="password" type="password" required minLength={8} autoComplete="new-password" />
        <Field label="Repítela" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
        {error && <ErrorText>{error}</ErrorText>}
        <Button type="submit" variant="dark" disabled={submitting} className="w-full">
          {submitting ? 'Guardando…' : 'Guardar contraseña'}
        </Button>
      </form>
    </AuthCard>
  )
}
