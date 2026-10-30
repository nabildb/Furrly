import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Avatar } from '../components/Avatar'
import { CleanProfileButton } from '../components/CleanProfileButton'
import { ConfirmedDecisionButton } from '../components/ConfirmedDecisionButton'
import { DeleteProfileButton } from '../components/DeleteProfileButton'
import { LogEntries } from '../components/ModerationLog'
import { Loading, Page, PageError } from '../components/Page'
import { SuspendButton } from '../components/SuspendButton'
import { WarnButton } from '../components/WarnButton'
import { Card, SectionTitle } from '../components/ui/Card'
import { api } from '../lib/api'
import type { Decision, UserFile } from '../lib/moderation'

const dayFormat = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })

function suspensionText(file: UserFile) {
  if (!file.suspendedAt) return null
  return file.suspendedUntil ? `Suspendida hasta el ${dayFormat.format(new Date(file.suspendedUntil))}` : 'Suspendida sin fecha de fin'
}

/** Ficha de una cuenta para moderar: quién es, qué ha hecho y todas las acciones en un sitio. */
export function ModerationUser() {
  const { username } = useParams()
  const navigate = useNavigate()
  const [file, setFile] = useState<UserFile | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    api<UserFile>(`/admin/users/${username}`)
      .then(setFile)
      .catch((e: Error) => setError(e.message))
  }, [username])

  useEffect(load, [load])

  if (error) return <PageError message={error} back="/moderacion" />
  if (!file) return <Loading />

  const stats = [
    ['Mascotas', file.counts.pets],
    ['Publicaciones', file.counts.posts],
    ['Avisos', file.counts.reports],
    ['Comentarios', file.counts.comments],
    ['Avistamientos', file.counts.sightings],
    ['Denuncias', file.flags],
    ['Advertencias', file.warnings],
  ] as const
  const suspension = suspensionText(file)

  function purge(decision: Decision) {
    return api(`/admin/users/${file!.username}/purge`, { method: 'POST', body: JSON.stringify(decision) }).then(load)
  }

  return (
    <Page title={`@${file.username}`} back="/moderacion" width="wide">
      <div className="space-y-4">
        <Card className="flex items-start gap-4">
          <Avatar url={file.avatarUrl} name={file.displayName} className="h-16 w-16 flex-none text-2xl" />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-display text-lg font-extrabold">{file.displayName}</p>
            <p className="text-sm font-semibold text-muted">En Furrly desde el {dayFormat.format(new Date(file.createdAt))}</p>
            {file.bio && <p className="text-[15px] whitespace-pre-line text-body">{file.bio}</p>}
            {suspension && <p className="text-sm font-extrabold text-danger">{suspension}</p>}
            {file.isAdmin && <p className="text-sm font-extrabold text-ink">Moderador</p>}
            <Link to={`/u/${file.username}`} className="inline-block text-sm font-extrabold text-lost-text hover:underline">
              Ver perfil público
            </Link>
          </div>
        </Card>

        <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
          {stats.map(([label, value]) => (
            <div key={label} className="flex flex-col-reverse rounded-2xl border border-card-line bg-surface px-3 py-2.5">
              <dt className="text-[13px] font-semibold text-muted">{label}</dt>
              <dd className="font-display text-lg font-extrabold">{value}</dd>
            </div>
          ))}
        </dl>

        {!file.isAdmin && (
          <Card className="space-y-3">
            <SectionTitle>Acciones</SectionTitle>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <WarnButton key={`warn-${file.username}`} username={file.username} onDone={load} />
              <SuspendButton key={file.username} username={file.username} onDone={load} />
              <CleanProfileButton
                username={file.username}
                onDone={(next) => (next === file.username ? load() : navigate(`/moderacion/usuarios/${next}`, { replace: true }))}
              />
              <ConfirmedDecisionButton label="Vaciar contenido" title={`Vaciar a @${file.username}`} username={file.username} onConfirm={purge}>
                <p className="text-[15px] font-semibold text-body">
                  Se borrarán sus mascotas, avisos, publicaciones, comentarios y avistamientos. La cuenta seguirá existiendo. No se puede deshacer.
                </p>
              </ConfirmedDecisionButton>
              <DeleteProfileButton username={file.username} onDeleted={() => navigate('/moderacion', { replace: true })} />
            </div>
          </Card>
        )}

        <Card className="space-y-3">
          <SectionTitle>Historial</SectionTitle>
          {file.history.length === 0 ? (
            <p className="text-[15px] font-semibold text-muted">Aún no se ha tomado ninguna decisión sobre esta cuenta.</p>
          ) : (
            <LogEntries entries={file.history} />
          )}
        </Card>
      </div>
    </Page>
  )
}
