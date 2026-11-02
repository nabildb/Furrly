import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { actionLabels, reasonLabels, type LogEntry, type LogPage } from '../lib/moderation'
import { formatTimeAgo } from '../lib/reports'
import { ErrorText } from './Field'
import { Loading } from './Page'
import { Button } from './ui/Button'
import { Card } from './ui/Card'

/** Historial de la moderación: quién hizo qué, a quién y por qué. */
export function ModerationLog() {
  const [entries, setEntries] = useState<LogEntry[] | null>(null)
  const [cursor, setCursor] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback((after?: string) => {
    api<LogPage>(`/admin/log${after ? `?cursor=${after}` : ''}`)
      .then((page) => {
        setEntries((prev) => [...(after ? (prev ?? []) : []), ...page.entries])
        setCursor(page.nextCursor)
      })
      .catch((e: Error) => setError(e.message))
  }, [])

  useEffect(() => load(), [load])

  if (error) return <ErrorText>{error}</ErrorText>
  if (!entries) return <Loading label="Cargando historial…" />
  if (entries.length === 0) {
    return <p className="py-8 text-center text-[15px] font-semibold text-muted">Aún no hay ninguna decisión registrada.</p>
  }

  return (
    <>
      <Card>
        <ul className="divide-y divide-card-line">
          {entries.map((entry) => (
            <li key={entry.id} className="space-y-0.5 py-2.5 first:pt-0 last:pb-0">
              <p className="text-[15px] leading-snug text-body">
                <strong className="font-extrabold">@{entry.moderator?.username ?? 'moderación'}</strong> {actionLabels[entry.action]}{' '}
                <strong className="font-extrabold">{entry.targetLabel}</strong>
              </p>
              <p className="text-[13px] font-semibold text-muted first-letter:uppercase">
                {formatTimeAgo(entry.createdAt)}
                {entry.reason && ` · ${reasonLabels[entry.reason]}`}
              </p>
              {entry.note && <p className="text-sm text-muted">Nota: {entry.note}</p>}
            </li>
          ))}
        </ul>
      </Card>
      {cursor && (
        <Button variant="secondary" size="md" onClick={() => load(cursor)} className="w-full">
          Ver más
        </Button>
      )}
    </>
  )
}
