import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ErrorText } from '../components/Field'
import { Loading, Page } from '../components/Page'
import { Badge } from '../components/ui/Badge'
import { ButtonLink } from '../components/ui/Button'
import { Card, SectionTitle } from '../components/ui/Card'
import { EyeIcon, PawIcon, PlusIcon } from '../components/ui/icons'
import { iconButtonClass } from '../components/ui/styles'
import { api } from '../lib/api'
import { cx } from '../lib/cx'
import { formatTimeAgo, reportStatusLabels, reportTypeLabels, type MyReport } from '../lib/reports'

export function MyReports() {
  const [reports, setReports] = useState<MyReport[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<MyReport[]>('/me/reports')
      .then(setReports)
      .catch((e: Error) => setError(e.message))
  }, [])

  if (!reports && !error) return <Loading />

  return (
    <Page
      title="Mis avisos"
      back="/perfil"
      action={
        <Link to="/avisos/nuevo" aria-label="Publicar aviso" className={iconButtonClass()}>
          <PlusIcon size={20} />
        </Link>
      }
    >
      {error && <ErrorText>{error}</ErrorText>}
      {reports?.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
          <SectionTitle>No has publicado ningún aviso</SectionTitle>
          <p className="max-w-xs text-[15px] font-semibold text-muted">Ojalá siga así. Si lo necesitas, se hace en un minuto.</p>
          <ButtonLink to="/avisos/nuevo" className="mt-2">
            <PlusIcon /> Publicar aviso
          </ButtonLink>
        </Card>
      ) : (
        <ul className="space-y-3">
          {reports?.map((r) => {
            const active = r.status === 'active'
            return (
              <li key={r.id}>
                <Link
                  to={`/avisos/${r.id}`}
                  className={cx(
                    'flex gap-3 rounded-card border border-card-line bg-surface p-3 transition hover:shadow-chip',
                    !active && 'opacity-70',
                  )}
                >
                  <div
                    className={cx(
                      'flex h-20 w-20 flex-none items-center justify-center overflow-hidden rounded-2xl',
                      r.type === 'lost' ? 'bg-[#F6D9C8] text-lost/40' : 'bg-[#D5E2F5] text-found/40',
                    )}
                  >
                    {r.photoUrl ? <img src={r.photoUrl} alt="" className="h-full w-full object-cover" /> : <PawIcon size={30} />}
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap gap-1.5">
                      <Badge tone={r.type}>{reportTypeLabels[r.type]}</Badge>
                      {!active && <Badge tone={r.status as 'resolved' | 'cancelled'}>{reportStatusLabels[r.status]}</Badge>}
                    </div>
                    <p className="line-clamp-2 font-display text-[15px] leading-tight font-extrabold">{r.title}</p>
                    <p className="flex flex-wrap items-center gap-x-1.5 text-[13px] font-semibold text-muted">
                      <span className="first-letter:uppercase">{formatTimeAgo(r.createdAt)}</span>
                      {r.type === 'lost' && (
                        <span className="inline-flex items-center gap-1 font-extrabold text-ink">
                          · <EyeIcon size={14} /> {r.sightingsCount}{' '}
                          {r.sightingsCount === 1 ? 'avistamiento' : 'avistamientos'}
                        </span>
                      )}
                    </p>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Page>
  )
}
