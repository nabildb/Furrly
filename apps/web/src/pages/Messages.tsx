import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Avatar } from '../components/Avatar'
import { ErrorText } from '../components/Field'
import { Loading, Page } from '../components/Page'
import { Card, SectionTitle } from '../components/ui/Card'
import { CountBadge } from '../components/ui/CountBadge'
import { MessageIcon } from '../components/ui/icons'
import { api } from '../lib/api'
import { cx } from '../lib/cx'
import { useRing } from '../lib/realtime'
import type { ConversationSummary } from '../lib/inbox'
import { formatTimeAgo } from '../lib/reports'

/** Bandeja de mensajes: una fila por conversación, la más reciente arriba. */
export function Messages() {
  const [conversations, setConversations] = useState<ConversationSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    api<ConversationSummary[]>('/conversations')
      .then(setConversations)
      .catch((e: Error) => setError(e.message))
  }, [])

  useEffect(load, [load])
  // Mensaje nuevo: la conversación sube arriba con su globo al momento.
  useRing((event) => event === 'message' && load())

  if (!conversations && !error) return <Loading />

  return (
    <Page title="Mensajes" back="/perfil" width="feed">
      {error && <ErrorText>{error}</ErrorText>}
      {conversations?.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-lost-soft text-lost">
            <MessageIcon size={30} />
          </span>
          <SectionTitle>No tienes mensajes</SectionTitle>
          <p className="max-w-xs text-[15px] font-semibold text-muted">
            Desde un aviso o el perfil de un vecino puedes escribirle para coordinaros.
          </p>
        </Card>
      ) : (
        <ul className="space-y-1">
          {conversations?.map((c) => (
            <li key={c.id}>
              <Link
                to={`/mensajes/${c.id}`}
                className={cx('flex items-center gap-3 rounded-2xl p-3 transition hover:bg-subtle', c.unread > 0 && 'bg-lost-soft/50')}
              >
                <Avatar url={c.other.avatarUrl} name={c.other.displayName} className="h-12 w-12 text-lg" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-display text-[15px] font-extrabold">{c.other.displayName}</span>
                    {c.lastMessage && (
                      <span className="flex-none text-xs font-semibold text-muted">{formatTimeAgo(c.lastMessage.createdAt)}</span>
                    )}
                  </span>
                  <span className={cx('block truncate text-sm', c.unread > 0 ? 'font-extrabold text-ink' : 'font-semibold text-muted')}>
                    {c.lastMessage ? `${c.lastMessage.fromMe ? 'Tú: ' : ''}${c.lastMessage.body}` : 'Sin mensajes'}
                  </span>
                </span>
                <CountBadge count={c.unread} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Page>
  )
}
