import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ErrorText } from '../components/Field'
import { Loading, Page } from '../components/Page'
import { Button } from '../components/ui/Button'
import { Card, SectionTitle } from '../components/ui/Card'
import { Chip } from '../components/ui/Chip'
import { api } from '../lib/api'
import {
  canRemove,
  reasonLabels,
  targetLabels,
  type FlaggedItem,
  type ModerationAction,
  type SuspendedUser,
} from '../lib/moderation'
import { formatTimeAgo } from '../lib/reports'

type Tab = 'pendientes' | 'resueltas'

const confirmations: Record<ModerationAction, ((item: FlaggedItem) => string) | null> = {
  dismiss: null,
  remove: (item) => `¿Borrar este ${targetLabels[item.targetType].toLowerCase()}? No se puede deshacer.`,
  suspend: (item) => `¿Suspender a @${item.target?.author.username}? No podrá entrar en Furrly hasta que levantes la suspensión.`,
}

function FlaggedCard({ item, onResolved }: { item: FlaggedItem; onResolved: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { target } = item

  async function resolve(action: ModerationAction) {
    const question = confirmations[action]?.(item)
    if (question && !confirm(question)) return
    setBusy(true)
    setError(null)
    try {
      await api('/admin/flags/resolve', {
        method: 'POST',
        body: JSON.stringify({ targetType: item.targetType, targetId: item.targetId, action }),
      })
      onResolved()
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-muted">
        <span className="rounded-full bg-subtle px-2.5 py-1 font-extrabold text-ink">{targetLabels[item.targetType]}</span>
        <span>
          {item.count === 1 ? '1 denuncia' : `${item.count} denuncias`} · {formatTimeAgo(item.lastFlaggedAt)}
        </span>
      </div>

      {target ? (
        <div className="space-y-2 rounded-[14px] bg-subtle p-3">
          <p className="font-extrabold">{target.title}</p>
          {target.imageUrl && <img src={target.imageUrl} alt="" className="max-h-48 rounded-[10px] object-cover" />}
          {target.text && <p className="text-[15px] whitespace-pre-line text-body">{target.text}</p>}
          {target.messages && (
            <ul className="space-y-1 text-sm">
              {target.messages.map((m, i) => (
                <li key={i}>
                  <strong className="font-extrabold">@{m.from}:</strong> {m.body}
                </li>
              ))}
            </ul>
          )}
          <p className="text-sm font-semibold text-muted">
            De{' '}
            <Link to={`/u/${target.author.username}`} className="font-extrabold text-lost-text hover:underline">
              @{target.author.username}
            </Link>
            {target.author.suspendedAt && ' · suspendido'}
            {target.url && (
              <>
                {' · '}
                <Link to={target.url} className="font-extrabold text-lost-text hover:underline">
                  Ver en Furrly
                </Link>
              </>
            )}
          </p>
        </div>
      ) : (
        <p className="rounded-[14px] bg-subtle p-3 text-sm font-semibold text-muted">El contenido ya no existe.</p>
      )}

      <ul className="space-y-1 text-sm text-body">
        {item.flags.map((f) => (
          <li key={f.by}>
            <strong className="font-extrabold">@{f.by}</strong>: {reasonLabels[f.reason]}
            {f.details && <span className="text-muted"> — “{f.details}”</span>}
          </li>
        ))}
      </ul>

      {error && <ErrorText>{error}</ErrorText>}
      {!item.resolvedAt && (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="md" disabled={busy} onClick={() => resolve('dismiss')}>
            Descartar
          </Button>
          {target && canRemove(item.targetType) && (
            <Button variant="danger" size="md" disabled={busy} onClick={() => resolve('remove')}>
              Borrar
            </Button>
          )}
          {target && !target.author.suspendedAt && (
            <Button variant="danger" size="md" disabled={busy} onClick={() => resolve('suspend')}>
              Suspender a @{target.author.username}
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}

function SuspendedUsers({ refreshKey }: { refreshKey: number }) {
  const [users, setUsers] = useState<SuspendedUser[]>([])

  useEffect(() => {
    api<SuspendedUser[]>('/admin/suspended')
      .then(setUsers)
      .catch(() => {})
  }, [refreshKey])

  async function lift(username: string) {
    if (!confirm(`¿Levantar la suspensión de @${username}?`)) return
    await api(`/admin/suspended/${username}`, { method: 'DELETE' })
    setUsers((list) => list.filter((u) => u.username !== username))
  }

  if (users.length === 0) return null
  return (
    <Card className="space-y-3">
      <SectionTitle>Cuentas suspendidas</SectionTitle>
      <ul className="divide-y divide-card-line">
        {users.map((u) => (
          <li key={u.username} className="flex items-center gap-3 py-2">
            <span className="min-w-0 flex-1 truncate text-[15px] font-bold">
              {u.displayName} <span className="text-muted">@{u.username}</span>
            </span>
            <Button variant="secondary" size="md" onClick={() => lift(u.username)}>
              Levantar
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  )
}

/** Lanza un error 500 a propósito en la API para comprobar que llega a Sentry. */
function SentryTest() {
  const [result, setResult] = useState<string | null>(null)

  async function run() {
    setResult(null)
    try {
      await api('/admin/sentry-test', { method: 'POST' })
    } catch {
      setResult('Error enviado. Debería aparecer en Sentry (proyecto furrly-api) en unos segundos.')
    }
  }

  return (
    <Card className="space-y-2">
      <SectionTitle>Errores en producción</SectionTitle>
      <p className="text-sm font-semibold text-muted">Comprueba que los errores de la API llegan a Sentry.</p>
      <Button variant="secondary" size="md" onClick={run}>
        Enviar error de prueba a Sentry
      </Button>
      {result && <p className="text-sm font-bold text-resolved-text">{result}</p>}
    </Card>
  )
}

/** Panel de moderación: denuncias agrupadas por contenido. Solo para administradores (la API lo comprueba). */
export function Moderation() {
  const [tab, setTab] = useState<Tab>('pendientes')
  const [items, setItems] = useState<FlaggedItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const load = useCallback(() => {
    api<FlaggedItem[]>(`/admin/flags?estado=${tab}`)
      .then(setItems)
      .catch((e: Error) => setError(e.message))
  }, [tab])

  useEffect(load, [load, refreshKey])

  function changeTab(next: Tab) {
    setItems(null)
    setTab(next)
  }

  return (
    <Page title="Moderación" back="/perfil">
      <div className="mb-5 flex gap-2">
        <Chip active={tab === 'pendientes'} onClick={() => changeTab('pendientes')}>
          Pendientes
        </Chip>
        <Chip active={tab === 'resueltas'} onClick={() => changeTab('resueltas')}>
          Resueltas
        </Chip>
      </div>

      <div className="space-y-4">
        {error && <ErrorText>{error}</ErrorText>}
        {!items ? (
          !error && <Loading label="Cargando denuncias…" />
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-[15px] font-semibold text-muted">
            {tab === 'pendientes' ? 'No hay nada pendiente de revisar. 🎉' : 'Aún no se ha resuelto ninguna denuncia.'}
          </p>
        ) : (
          items.map((item) => (
            <FlaggedCard key={`${item.targetType}:${item.targetId}`} item={item} onResolved={() => setRefreshKey((k) => k + 1)} />
          ))
        )}
        <SuspendedUsers refreshKey={refreshKey} />
        <SentryTest />
      </div>
    </Page>
  )
}
