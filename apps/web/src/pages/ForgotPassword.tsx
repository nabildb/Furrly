import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Field } from '../components/Field'
import { supabase } from '../lib/supabase'

export function ForgotPassword() {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const email = String(new FormData(e.currentTarget).get('email'))
    setSubmitting(true)
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/restablecer`,
    })
    setSubmitting(false)
    // Por seguridad no decimos si el email existe: el mensaje es el mismo en ambos casos.
    if (error && error.status !== 400) setError('No se pudo enviar el email. Inténtalo más tarde.')
    else setSentTo(email)
  }

  if (sentTo) {
    return (
      <p>
        Si existe una cuenta con <strong>{sentTo}</strong>, te llegará un email con un enlace para elegir una contraseña
        nueva.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-4 px-4 pt-6 pb-32">
      <h1 className="text-xl font-semibold">Recuperar contraseña</h1>
      <p className="text-sm text-gray-600">Te enviaremos un enlace para elegir una contraseña nueva.</p>
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={submitting} className="rounded bg-black px-4 py-2 text-white disabled:opacity-50">
        {submitting ? 'Enviando…' : 'Enviar enlace'}
      </button>
      <p className="text-sm">
        <Link to="/login" className="underline">Volver a entrar</Link>
      </p>
    </form>
  )
}
