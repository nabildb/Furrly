import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { ChatComposer, ChatHeader, MessageBubble, ReportContext } from '../components/Chat'
import { BlockButton } from '../components/BlockButton'
import { ErrorText } from '../components/Field'
import { FlagButton } from '../components/FlagButton'
import { Loading, PageError } from '../components/Page'
import { Button } from '../components/ui/Button'
import { useInbox } from '../inbox/useInbox'
import { api } from '../lib/api'
import { useRing } from '../lib/realtime'
import type { ChatMessage, ConversationDetail } from '../lib/inbox'
import type { Report } from '../lib/reports'
import type { PublicProfile } from '../lib/users'

// Red de seguridad: lo normal es que el timbre de tiempo real avise al momento (ver lib/realtime.ts).
const POLL_MS = 30_000

/** Lleva el scroll al final cuando llegan mensajes nuevos. */
function useScrollToEnd(dep: unknown) {
  useLayoutEffect(() => {
    window.scrollTo({ top: document.body.scrollHeight })
  }, [dep])
}

/** Conversación abierta: mensajes, cargar anteriores y responder. Se refresca cada 8 s. */
export function Conversation() {
  const { id } = useParams()
  const { refresh: refreshInbox } = useInbox()
  const [data, setData] = useState<ConversationDetail | null>(null)
  const [older, setOlder] = useState<ChatMessage[]>([])
  const [olderCursor, setOlderCursor] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const lastId = data?.messages[data.messages.length - 1]?.id

  const load = useCallback(() => {
    api<ConversationDetail>(`/conversations/${id}`)
      .then((d) => {
        setData(d)
        refreshInbox()
      })
      .catch((e: Error) => setError(e.message))
  }, [id, refreshInbox])

  useEffect(() => {
    load()
    const timer = setInterval(() => document.visibilityState === 'visible' && load(), POLL_MS)
    return () => clearInterval(timer)
  }, [load])
  // Mensaje nuevo en esta conversación: se carga al momento.
  useRing((event, payload) => event === 'message' && payload.conversationId === id && load())

  useScrollToEnd(lastId)

  if (error && !data) return <PageError message={error} back="/mensajes" />
  if (!data) return <Loading />

  // El primer cursor de "anteriores" sale de la primera carga; luego, de cada página antigua.
  const cursor = older.length > 0 ? olderCursor : data.olderCursor

  async function loadOlder() {
    if (!cursor) return
    const page = await api<ConversationDetail>(`/conversations/${id}?before=${cursor}`)
    setOlder((prev) => [...page.messages, ...prev])
    setOlderCursor(page.olderCursor)
  }

  async function send(body: string) {
    setError(null)
    try {
      const message = await api<ChatMessage>(`/conversations/${id}/messages`, { method: 'POST', body: JSON.stringify({ body }) })
      setData((d) => d && { ...d, messages: [...d.messages, message] })
    } catch (e) {
      setError((e as Error).message)
      throw e
    }
  }

  // Si la última página del polling ya incluye mensajes que teníamos como "antiguos", no los repetimos.
  const shown = new Set(data.messages.map((m) => m.id))
  const messages = [...older.filter((m) => !shown.has(m.id)), ...data.messages]

  return (
    <main className="mx-auto max-w-2xl pb-28">
      <ChatHeader
        other={data.other}
        action={
          <div className="flex flex-col items-end gap-1">
            <BlockButton username={data.other.username} blockedByMe={data.blockedByMe} onChange={load} />
            <FlagButton target={{ targetType: 'conversation', targetId: data.id }} />
          </div>
        }
      />
      <div className="space-y-2 px-4 pt-4">
        {cursor && (
          <Button variant="secondary" size="md" onClick={loadOlder} className="mx-auto mb-2 flex">
            Ver mensajes anteriores
          </Button>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {error && <ErrorText>{error}</ErrorText>}
      </div>
      {data.canReply ? (
        <ChatComposer onSend={send} />
      ) : (
        // Con un bloqueo de por medio no se puede escribir. Solo se dice si lo has bloqueado tú.
        <p className="fixed right-0 bottom-0 left-(--sidebar-w) z-[1100] border-t border-card-line bg-surface px-4 pt-4 pb-[max(20px,env(safe-area-inset-bottom))] text-center text-sm font-semibold text-muted">
          {data.blockedByMe
            ? `Has bloqueado a @${data.other.username}: no podéis escribiros.`
            : 'No puedes responder a esta conversación.'}
        </p>
      )}
    </main>
  )
}

/**
 * Escribir a alguien por primera vez: /mensajes/nuevo?para=<username>&aviso=<id>.
 * Si ya hay conversación, la API la reutiliza; al enviar se pasa a /mensajes/:id.
 */
export function NewConversation() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const username = params.get('para') ?? ''
  const reportId = params.get('aviso')
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)

  useEffect(() => {
    api<PublicProfile>(`/users/${encodeURIComponent(username)}`)
      .then(setProfile)
      .catch((e: Error) => setError(e.message))
    if (reportId) api<Report>(`/reports/${reportId}`).then(setReport, () => {})
  }, [username, reportId])

  if (error) return <PageError message={error} back="/mensajes" />
  if (!profile) return <Loading />

  async function send(body: string) {
    setSendError(null)
    try {
      const res = await api<{ conversationId: string }>('/conversations', {
        method: 'POST',
        body: JSON.stringify({ username, body, reportId: report?.id ?? null }),
      })
      navigate(`/mensajes/${res.conversationId}`, { replace: true })
    } catch (e) {
      setSendError((e as Error).message)
      throw e
    }
  }

  return (
    <main className="mx-auto max-w-2xl pb-28">
      <ChatHeader other={{ username: profile.username, displayName: profile.displayName, avatarUrl: profile.avatarUrl }} />
      <div className="space-y-3 px-4 pt-6 text-center">
        {report && (
          <div className="mx-auto max-w-sm text-left">
            <ReportContext report={report} />
          </div>
        )}
        <p className="text-[15px] font-semibold text-muted">
          Escribe a @{profile.username}. {report ? 'El mensaje irá asociado a este aviso.' : ''}
        </p>
        {sendError && <ErrorText>{sendError}</ErrorText>}
      </div>
      <ChatComposer
        onSend={send}
        placeholder={report?.type === 'found' ? 'Creo que es mío…' : report ? 'Creo que la he visto…' : 'Escribe un mensaje…'}
      />
    </main>
  )
}
