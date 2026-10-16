import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { Field } from '../components/Field'
import { supabase } from '../lib/supabase'

/** Destino del enlace del email: Supabase ya ha abierto una sesión temporal de recuperación. */
export function ResetPassword() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) return <p>Cargando…</p>
  if (!session) {
    return (
      <p>
        El enlace no es válido o ha caducado.{' '}
        <Link to="/recuperar" className="underline">Pide uno nuevo</Link>.
      </p>
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
    navigate('/')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h1 className="text-xl font-semibold">Elige una contraseña nueva</h1>
      <Field label="Contraseña nueva" name="password" type="password" required minLength={8} autoComplete="new-password" />
      <Field label="Repítela" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={submitting} className="rounded bg-black px-4 py-2 text-white disabled:opacity-50">
        {submitting ? 'Guardando…' : 'Guardar contraseña'}
      </button>
    </form>
  )
}
