import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { api } from '../lib/api'
import { cx } from '../lib/cx'
import { ErrorText, TextAreaField } from './Field'
import { Button } from './ui/Button'
import { CheckIcon, FlagIcon } from './ui/icons'
import { Sheet } from './ui/Sheet'

export type FlagTarget =
  | { targetType: 'report' | 'post' | 'comment'; targetId: string }
  | { targetType: 'user'; username: string }

const reasons = {
  spam: 'Spam o publicidad',
  inappropriate: 'Contenido inapropiado u ofensivo',
  fake: 'Es falso o engañoso',
  other: 'Otro motivo',
} as const

const targetNames: Record<FlagTarget['targetType'], string> = {
  report: 'este aviso',
  post: 'esta publicación',
  comment: 'este comentario',
  user: 'a este usuario',
}

function FlagForm({ target, onDone }: { target: FlagTarget; onDone: () => void }) {
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setSending(true)
    setError(null)
    try {
      await api('/flags', {
        method: 'POST',
        body: JSON.stringify({ ...target, reason: form.get('reason'), details: form.get('details') }),
      })
      setSent(true)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-resolved-soft text-resolved-text">
          <CheckIcon size={28} />
        </span>
        <p className="text-[15px] font-semibold text-body">Gracias por avisar. Lo revisaremos lo antes posible.</p>
        <Button variant="dark" onClick={onDone} className="w-full">
          Cerrar
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="mb-2 text-[15px] font-semibold text-muted">¿Qué pasa con {targetNames[target.targetType]}?</legend>
        {Object.entries(reasons).map(([value, label], i) => (
          <label
            key={value}
            className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-card-line bg-surface px-4 py-3 text-[15px] font-bold has-[:checked]:border-ink"
          >
            <input type="radio" name="reason" value={value} required defaultChecked={i === 0} className="accent-ink" />
            {label}
          </label>
        ))}
      </fieldset>
      <TextAreaField label="Detalles (opcional)" name="details" maxLength={500} rows={2} />
      {error && <ErrorText>{error}</ErrorText>}
      <Button type="submit" variant="dark" disabled={sending} className="w-full">
        {sending ? 'Enviando…' : 'Enviar denuncia'}
      </Button>
    </form>
  )
}

/** Enlace discreto "Denunciar" que abre la hoja con los motivos. Sin sesión lleva al login. */
export function FlagButton({ target, className, label = 'Denunciar' }: { target: FlagTarget; className?: string; label?: string }) {
  const { session } = useAuth()
  const [open, setOpen] = useState(false)
  const classes = cx('inline-flex items-center gap-1.5 text-[13px] font-extrabold text-muted hover:text-danger', className)

  if (!session) {
    return (
      <Link to="/login" className={classes} aria-label={label ? undefined : 'Denunciar'}>
        <FlagIcon size={16} /> {label}
      </Link>
    )
  }
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={classes} aria-label={label ? undefined : 'Denunciar'}>
        <FlagIcon size={16} /> {label}
      </button>
      {open && (
        <Sheet title="Denunciar" onClose={() => setOpen(false)}>
          <FlagForm target={target} onDone={() => setOpen(false)} />
        </Sheet>
      )}
    </>
  )
}
