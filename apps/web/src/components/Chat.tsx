import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { cx } from '../lib/cx'
import type { ChatMessage, ConversationSummary } from '../lib/inbox'
import { formatWhen } from '../lib/reports'
import { Avatar } from './Avatar'
import { BackButton } from './Page'
import { SendIcon } from './ui/icons'

/** Cabecera de la conversación: volver, con quién hablas y una acción opcional. */
export function ChatHeader({ other, action }: { other: ConversationSummary['other']; action?: ReactNode }) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-card-line bg-bg/95 px-4 py-3 backdrop-blur">
      <BackButton fallback="/mensajes" />
      <Link to={`/u/${other.username}`} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar url={other.avatarUrl} name={other.displayName} className="h-10 w-10 text-base" />
        <span className="min-w-0">
          <span className="block truncate font-display text-[15px] font-extrabold">{other.displayName}</span>
          <span className="block truncate text-[13px] font-semibold text-muted">@{other.username}</span>
        </span>
      </Link>
      {action}
    </header>
  )
}

/** Tarjeta "Sobre: ..." con el aviso del que se habla. */
export function ReportContext({ report }: { report: NonNullable<ChatMessage['report']> }) {
  return (
    <Link
      to={`/avisos/${report.id}`}
      className={cx(
        'mb-1 block rounded-xl px-3 py-2 text-[13px] font-bold',
        report.type === 'lost' ? 'bg-lost-soft text-lost-text' : 'bg-found-soft text-found-text',
      )}
    >
      Sobre: {report.title}
    </Link>
  )
}

export function MessageBubble({ message }: { message: ChatMessage }) {
  return (
    <div className={cx('flex', message.fromMe ? 'justify-end' : 'justify-start')}>
      <div
        className={cx(
          'max-w-[80%] rounded-[20px] px-3.5 py-2.5 text-[15px] leading-snug',
          message.fromMe ? 'rounded-br-md bg-ink text-white' : 'rounded-bl-md border border-card-line bg-surface text-ink',
        )}
      >
        {message.report && <ReportContext report={message.report} />}
        <p className="break-words whitespace-pre-line">{message.body}</p>
        <p className={cx('mt-1 text-right text-[11px] font-semibold', message.fromMe ? 'text-white/60' : 'text-muted')}>
          {formatWhen(message.createdAt)}
        </p>
      </div>
    </div>
  )
}

/** Caja de escribir, fija abajo. Enter envía; Mayús+Enter hace salto de línea. */
export function ChatComposer({ onSend, placeholder = 'Escribe un mensaje…' }: { onSend: (body: string) => Promise<void>; placeholder?: string }) {
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  async function submit(e?: FormEvent) {
    e?.preventDefault()
    const text = body.trim()
    if (!text || sending) return
    setSending(true)
    try {
      await onSend(text)
      setBody('')
    } finally {
      setSending(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className="fixed right-0 bottom-0 left-(--sidebar-w) z-[1100] border-t border-card-line bg-surface"
    >
      <div className="mx-auto flex max-w-2xl items-end gap-2 px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
        <label htmlFor="chat-body" className="sr-only">
          Mensaje
        </label>
        <textarea
          id="chat-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void submit()
            }
          }}
          rows={1}
          maxLength={1000}
          placeholder={placeholder}
          className="max-h-32 min-h-12 flex-1 resize-none rounded-[20px] border border-line bg-bg px-4 py-3 text-[15px] font-semibold placeholder:font-normal placeholder:text-muted/70 focus:border-ink focus:outline-none [field-sizing:content]"
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          aria-label="Enviar"
          className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-lost text-white transition hover:bg-lost-text disabled:opacity-40"
        >
          <SendIcon size={20} />
        </button>
      </div>
    </form>
  )
}
