import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { actionLabels, logFilters, reasonLabels, type LogEntry, type LogPage } from '../lib/moderation'
import { formatTimeAgo } from '../lib/reports'
import { ErrorText, SelectField } from './Field'
import { Loading } from './Page'
import { Button } from './ui/Button'
import { Card } from './ui/Card'

/** Lista de decisiones: quién hizo qué, a quién y por qué. */
export function LogEntries({ entries }: { entries: LogEntry[] }) {
  return (
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
  )
}

/** Historial completo de la moderación, con filtro por tipo de decisión. */
export function ModerationLog() {
  const [action, setAction] = useState('')
  const [entries, setEntries] = useState<LogEntry[] | null>(null)
  const [cursor, setCursor] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    (after?: string) => {
      const params = new URLSearchParams()
      if (action) params.set('action', action)
      if (after) params.set('cursor', after)
      api<LogPage>(`/admin/log?${params}`)
        .then((page) => {
          setEntries((prev) => [...(after ? (prev ?? []) : []), ...page.entries])
          setCursor(page.nextCursor)
        })
        .catch((e: Error) => setError(e.message))
    },
    [action],
  )

  useEffect(() => load(), [load])

  function changeFilter(next: string) {
    setEntries(null)
    setAction(next)
  }

  return (
    <>
      <SelectField label="Mostrar" options={logFilters} value={action} onChange={(e) => changeFilter(e.target.value)} />
      {error && <ErrorText>{error}</ErrorText>}
      {!entries ? (
        !error && <Loading label="Cargando historial…" />
      ) : entries.length === 0 ? (
        <p className="py-8 text-center text-[15px] font-semibold text-muted">No hay ninguna decisión que mostrar.</p>
      ) : (
        <Card>
          <LogEntries entries={entries} />
        </Card>
      )}
      {cursor && (
        <Button variant="secondary" size="md" onClick={() => load(cursor)} className="w-full">
          Ver más
        </Button>
      )}
    </>
  )
}
