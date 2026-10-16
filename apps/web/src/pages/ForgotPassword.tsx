import { useState, type FormEvent } from 'react'
import { AuthCard, AuthLink } from '../components/AuthCard'
import { ErrorText, Field } from '../components/Field'
import { Button } from '../components/ui/Button'
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

  const footer = <AuthLink to="/login">Volver a entrar</AuthLink>

  if (sentTo) {
    return (
      <AuthCard title="Revisa tu email" footer={footer}>
        <p className="text-[15px] leading-relaxed text-body">
          Si existe una cuenta con <strong className="font-extrabold">{sentTo}</strong>, te llegará un enlace para elegir
          una contraseña nueva.
        </p>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Recuperar contraseña" subtitle="Te enviaremos un enlace para elegir una nueva." footer={footer}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        {error && <ErrorText>{error}</ErrorText>}
        <Button type="submit" variant="dark" disabled={submitting} className="w-full">
          {submitting ? 'Enviando…' : 'Enviar enlace'}
        </Button>
      </form>
    </AuthCard>
  )
}
