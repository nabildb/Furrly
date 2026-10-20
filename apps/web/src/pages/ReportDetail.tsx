import { useCallback, useEffect, useMemo, useState, type UIEvent } from 'react'
import { Link, useParams } from 'react-router'
import { Marker, Polyline, useMap } from 'react-leaflet'
import { useAuth } from '../auth/useAuth'
import { useMe } from '../auth/useMe'
import { ErrorText } from '../components/Field'
import { FlagButton } from '../components/FlagButton'
import { ReportMatches } from '../components/ReportMatches'
import { originIcon, sightingIcon } from '../components/mapMarkers'
import { MapView } from '../components/MapView'
import { BackButton, Loading, PageError } from '../components/Page'
import { SightingForm } from '../components/SightingForm'
import { Badge } from '../components/ui/Badge'
import { Button, ButtonLink } from '../components/ui/Button'
import { Card, SectionTitle } from '../components/ui/Card'
import { CheckIcon, EditIcon, EyeIcon, MailIcon, MessageIcon, PawIcon, PhoneIcon, ShareIcon } from '../components/ui/icons'
import { Sheet } from '../components/ui/Sheet'
import { buttonClass, iconButtonClass } from '../components/ui/styles'
import { api } from '../lib/api'
import { cx } from '../lib/cx'
import { speciesLabels } from '../lib/pets'
import {
  formatDateTime,
  formatTimeAgo,
  formatWhen,
  reportStatusLabels,
  reportTypeLabels,
  SIGHTING_LINE_COLOR,
  type LatLng,
  type Report,
  type Sighting,
} from '../lib/reports'
import { shareCurrentPage } from '../lib/share'
import { removeImage } from '../lib/storage'

/** Ajusta el zoom para que se vea todo el recorrido. */
function FitRoute({ points }: { points: LatLng[] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points.map((p) => [p.lat, p.lng]), { padding: [36, 36], maxZoom: 16 })
  }, [map, points])
  return null
}

/** Botones redondos blancos sobre la foto. */
const overPhotoButton = 'flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-ink shadow-chip backdrop-blur'

export function ReportDetail() {
  const { id } = useParams()
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [sightings, setSightings] = useState<Sighting[]>([])
  const [sightingsVersion, setSightingsVersion] = useState(0)
  const [showSightingForm, setShowSightingForm] = useState(false)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const { session } = useAuth()
  const myUsername = useMe().username ?? undefined
  const closeSightingForm = useCallback(() => setShowSightingForm(false), [])

  useEffect(() => {
    api<Report>(`/reports/${id}`)
      .then(setReport)
      .catch((e: Error) => setError(e.message))
  }, [id])

  // Solo las mascotas perdidas tienen avistamientos. sightingsVersion fuerza la recarga.
  const isLostReport = report?.type === 'lost'
  useEffect(() => {
    if (!isLostReport) return
    api<Sighting[]>(`/reports/${id}/sightings`)
      .then(setSightings)
      .catch((e: Error) => setActionError(e.message))
  }, [id, isLostReport, sightingsVersion])

  // Recorrido: del punto de la pérdida a cada avistamiento, en orden cronológico.
  // Memorizado para que el mapa no se reencuadre en cada render.
  const route = useMemo(
    () => (report ? [report.location, ...sightings.map((s) => s.location)] : []),
    [report, sightings],
  )

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(timer)
  }, [toast])

  if (error) return <PageError message={error} />
  if (!report) return <Loading />

  const isLost = report.type === 'lost'
  const isActive = report.status === 'active'
  // Solo decide si se muestran los botones: quien de verdad lo comprueba es la API.
  const isReporter = myUsername === report.reporter.username

  async function changeStatus(status: 'resolved' | 'cancelled') {
    const question =
      status === 'resolved'
        ? '¿Marcar el aviso como resuelto? Dejará de aparecer en el mapa.'
        : '¿Cancelar el aviso? Dejará de aparecer en el mapa.'
    if (!report || !confirm(question)) return
    setUpdating(true)
    setActionError(null)
    try {
      setReport(await api<Report>(`/reports/${report.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }))
    } catch (e) {
      setActionError((e as Error).message)
    } finally {
      setUpdating(false)
    }
  }

  async function deleteSighting(sighting: Sighting) {
    if (!report || !confirm('¿Borrar este avistamiento?')) return
    try {
      await api(`/reports/${report.id}/sightings/${sighting.id}`, { method: 'DELETE' })
      // La foto solo la puede borrar quien la subió (políticas de Storage).
      if (sighting.photoUrl && sighting.user.username === myUsername) await removeImage(sighting.photoUrl)
      setSightingsVersion((v) => v + 1)
    } catch (e) {
      setActionError((e as Error).message)
    }
  }

  async function share() {
    if (!report) return
    const result = await shareCurrentPage(report.title)
    if (result === 'copied') setToast('Enlace copiado')
  }

  function onPhotosScroll(e: UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    setPhotoIndex(Math.round(el.scrollLeft / el.clientWidth))
  }

  const photos = report.photos.length > 0 ? report.photos : report.pet?.photoUrl ? [report.pet.photoUrl] : []
  const subtitle = [report.pet?.name, speciesLabels[report.species], report.pet?.breed].filter(Boolean).join(' · ')
  // Los avistamientos se numeran por orden (1 = el primero) pero la lista enseña antes el más reciente.
  const numbered = sightings.map((s, i) => ({ ...s, n: i + 1 })).reverse()
  const showBottomBar = isActive && (isReporter || isLost || !session)

  // Escribir al autor: sin sesión, primero al login, que luego lleva a la conversación.
  const composeLink = `/mensajes/nuevo?para=${report.reporter.username}&aviso=${report.id}`
  const messageLink = session ? composeLink : '/login'
  const messageState = session ? undefined : { from: composeLink }

  // Mismos botones en la barra fija (móvil y tablet) y en la columna derecha (escritorio).
  const actionButtons = isReporter ? (
    <>
      <Link
        to={`/avisos/${report.id}/editar`}
        aria-label="Editar aviso"
        className={iconButtonClass('h-14 w-14 rounded-btn')}
      >
        <EditIcon />
      </Link>
      <Button variant="dark" className="flex-1" disabled={updating} onClick={() => changeStatus('resolved')}>
        <CheckIcon /> {isLost ? '¡Ya está en casa!' : 'Ya está con su familia'}
      </Button>
    </>
  ) : (
    <>
      <Link
        to={messageLink}
        state={messageState}
        aria-label={`Escribir a @${report.reporter.username}`}
        className={iconButtonClass('h-14 w-14 rounded-btn')}
      >
        <MessageIcon />
      </Link>
      {isLost ? (
        session ? (
          <Button variant="sighting" className="flex-1" onClick={() => setShowSightingForm(true)}>
            <EyeIcon /> La he visto
          </Button>
        ) : (
          <ButtonLink to="/login" state={{ from: `/avisos/${report.id}` }} variant="sighting" className="flex-1">
            <EyeIcon /> Entra para avisar
          </ButtonLink>
        )
      ) : (
        <Button variant="dark" className="flex-1" onClick={share}>
          <ShareIcon /> Compartir aviso
        </Button>
      )}
    </>
  )

  return (
    <main
      className={cx(
        'mx-auto max-w-2xl sm:px-6 sm:pt-6',
        // Escritorio: foto y datos a la izquierda; mapa, avistamientos y acciones a la derecha (fija al bajar).
        'lg:grid lg:max-w-6xl lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-10 lg:px-10 lg:pt-10 lg:pb-12',
        showBottomBar ? 'pb-32' : 'pb-12',
      )}
    >
      <div className="min-w-0">
        {/* Foto grande (carrusel si hay varias) con volver y compartir encima */}
        <div className="relative h-[260px] overflow-hidden bg-[#F6D9C8] sm:h-[340px] sm:rounded-[28px] lg:h-[420px]">
          {photos.length > 0 ? (
            <div
              onScroll={onPhotosScroll}
              className="flex h-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]"
            >
              {photos.map((url, i) => (
                <img
                  key={url}
                  src={url}
                  alt={i === 0 ? `Foto de ${report.pet?.name ?? speciesLabels[report.species].toLowerCase()}` : ''}
                  className="h-full w-full flex-none snap-center object-cover"
                />
              ))}
            </div>
          ) : (
            <div
              className={cx(
                'flex h-full items-center justify-center',
                isLost ? 'text-lost/30' : 'bg-[#D5E2F5] text-found/30',
              )}
            >
              <PawIcon size={72} />
            </div>
          )}
          <BackButton fallback="/avisos" className={cx(overPhotoButton, 'absolute top-4 left-4')} />
          <button type="button" onClick={share} aria-label="Compartir aviso" className={cx(overPhotoButton, 'absolute top-4 right-4')}>
            <ShareIcon size={20} />
          </button>
          {photos.length > 1 && (
            <div className="absolute bottom-9 left-1/2 flex -translate-x-1/2 gap-1.5 sm:bottom-4" aria-hidden="true">
              {photos.map((url, i) => (
                <span
                  key={url}
                  className={cx('h-1.5 rounded-full transition-all', i === photoIndex ? 'w-[18px] bg-white' : 'w-1.5 bg-white/60')}
                />
              ))}
            </div>
          )}
        </div>

        {/* Hoja con los datos, que se monta sobre la foto */}
        <article className="relative -mt-5 space-y-5 rounded-t-3xl bg-bg px-5 pt-5 sm:mt-0 sm:px-1">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={report.type} solid>
                {reportTypeLabels[report.type]}
              </Badge>
              {!isActive && <Badge tone={report.status as 'resolved' | 'cancelled'}>{reportStatusLabels[report.status]}</Badge>}
              <span className="text-[13px] font-semibold text-muted">
                {isActive ? 'Activo' : 'Cerrado'} · {formatTimeAgo(report.createdAt)}
              </span>
            </div>
            <h1 className="font-display text-[26px] leading-[1.15] font-extrabold tracking-[-0.8px]">{report.title}</h1>
            {subtitle && <p className="text-[15px] font-semibold text-muted">{subtitle}</p>}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-[14px] border border-card-line bg-surface px-3 py-2.5">
              <div className="text-xs font-semibold text-muted">Dónde</div>
              <div className="text-sm font-extrabold">{report.addressText ?? 'Ver en el mapa'}</div>
            </div>
            <div className="rounded-[14px] border border-card-line bg-surface px-3 py-2.5">
              <div className="text-xs font-semibold text-muted">Cuándo</div>
              <div className="text-sm font-extrabold" title={formatDateTime(report.happenedAt)}>
                {formatWhen(report.happenedAt)}
              </div>
            </div>
          </div>

          {report.status === 'resolved' && report.resolvedAt && (
            <p className="flex items-center gap-2 rounded-2xl bg-resolved-soft px-4 py-3 text-[15px] font-bold text-resolved-text">
              <CheckIcon size={20} />
              {isLost ? '¡Ya está en casa!' : '¡Ya ha vuelto con su familia!'} Resuelto el {formatDateTime(report.resolvedAt)}.
            </p>
          )}

          <Card className="space-y-1.5">
            <SectionTitle>{isLost ? 'Cómo es' : 'Detalles'}</SectionTitle>
            <p className="text-[15px] leading-relaxed whitespace-pre-line text-body">{report.description}</p>
            <p className="pt-1 text-[13px] font-semibold text-muted">
              Aviso de{' '}
              <Link to={`/u/${report.reporter.username}`} className="font-extrabold text-ink underline-offset-2 hover:underline">
                @{report.reporter.username}
              </Link>
            </p>
          </Card>

          {isActive && <ReportMatches reportId={report.id} type={report.type} />}

          {isActive && (
            <Card className="flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <SectionTitle>Cartel para imprimir</SectionTitle>
                <p className="mt-1 text-sm font-semibold text-muted">
                  {isLost ? 'Pégalo por el barrio' : 'Pégalo donde lo encontraste'}: el código QR abre este aviso.
                </p>
              </div>
              <ButtonLink to={`/avisos/${report.id}/cartel`} variant="secondary" size="md" className="flex-none">
                Ver cartel
              </ButtonLink>
            </Card>
          )}

          {!isReporter && (
            <Card className="space-y-3">
              <SectionTitle>Contactar con @{report.reporter.username}</SectionTitle>
              {report.contact ? (
                <div className="space-y-2">
                  {report.contact.phone && (
                    <div className="flex flex-wrap gap-2">
                      <a href={`tel:${report.contact.phone.replace(/[^\d+]/g, '')}`} className={buttonClass('secondary', 'md')}>
                        <PhoneIcon size={20} /> {report.contact.phone}
                      </a>
                      <a
                        href={`https://wa.me/${report.contact.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={buttonClass('secondary', 'md')}
                      >
                        WhatsApp
                      </a>
                    </div>
                  )}
                  {report.contact.email && (
                    <a href={`mailto:${report.contact.email}`} className={buttonClass('secondary', 'md', 'max-w-full')}>
                      <MailIcon size={20} /> <span className="truncate">{report.contact.email}</span>
                    </a>
                  )}
                </div>
              ) : (
                report.hasContact &&
                !session && <p className="text-[15px] font-semibold text-muted">Ha dejado teléfono o email: entra para verlo.</p>
              )}
              <ButtonLink to={messageLink} state={messageState} variant="dark" size="md" className="w-full">
                <MessageIcon size={20} /> {session ? 'Enviar mensaje' : 'Entra para escribirle'}
              </ButtonLink>
            </Card>
          )}

          {!isReporter && <FlagButton target={{ targetType: 'report', targetId: report.id }} label="Denunciar este aviso" />}
        </article>
      </div>

      <section aria-label="Recorrido y acciones" className="space-y-5 px-5 pt-5 sm:px-1 lg:sticky lg:top-10 lg:px-0 lg:pt-0">
        <section className="space-y-2">
          <div className="flex items-baseline justify-between">
            <SectionTitle>{isLost ? 'Su recorrido' : 'Dónde se encontró'}</SectionTitle>
            {isLost && (
              <span className="text-[13px] font-semibold text-muted">
                {sightings.length} {sightings.length === 1 ? 'avistamiento' : 'avistamientos'}
              </span>
            )}
          </div>
          <MapView center={report.location} zoom={15} className="h-56 sm:h-72">
            <FitRoute points={route} />
            {sightings.length > 0 && (
              <Polyline
                positions={route}
                pathOptions={{ color: SIGHTING_LINE_COLOR, dashArray: '7 7', weight: 3, lineCap: 'round' }}
              />
            )}
            <Marker
              position={report.location}
              icon={originIcon(report.type)}
              title={isLost ? 'Se perdió aquí' : 'Se encontró aquí'}
            />
            {sightings.map((s, i) => (
              <Marker key={s.id} position={s.location} icon={sightingIcon(i + 1)} title={`Avistamiento ${i + 1}`} />
            ))}
          </MapView>
        </section>

        {isLost &&
          (numbered.length === 0 ? (
            <p className="text-[15px] font-semibold text-muted">
              Nadie ha avisado todavía de que la haya visto.
              {isActive && !isReporter && ' Si la ves, pulsa «La he visto».'}
            </p>
          ) : (
            <ol className="space-y-3">
              {numbered.map((s) => (
                <li key={s.id} className="flex items-start gap-2.5">
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-sighting text-xs font-extrabold">
                    {s.n}
                  </span>
                  <div className="min-w-0 flex-1 text-sm leading-snug">
                    <p>
                      <strong className="inline-block font-extrabold first-letter:uppercase" title={formatDateTime(s.seenAt)}>
                        {formatTimeAgo(s.seenAt)}
                      </strong>{' '}
                      ·{' '}
                      <Link to={`/u/${s.user.username}`} className="hover:underline">
                        @{s.user.username}
                      </Link>
                    </p>
                    {s.note && <p className="text-muted">{s.note}</p>}
                    {s.photoUrl && <img src={s.photoUrl} alt="" className="mt-2 h-24 w-24 rounded-xl object-cover" />}
                  </div>
                  {(s.user.username === myUsername || isReporter) && (
                    <button
                      type="button"
                      onClick={() => deleteSighting(s)}
                      className="rounded-lg px-2 py-1 text-xs font-extrabold text-danger hover:bg-lost-soft"
                    >
                      Borrar
                    </button>
                  )}
                </li>
              ))}
            </ol>
          ))}

        {actionError && <ErrorText>{actionError}</ErrorText>}

        {showBottomBar && <div className="hidden gap-2.5 lg:flex">{actionButtons}</div>}

        {isReporter && isActive && (
          <Button variant="danger" size="md" onClick={() => changeStatus('cancelled')} disabled={updating} className="w-full">
            Cancelar aviso
          </Button>
        )}
      </section>

      {/* Barra fija de acciones */}
      {showBottomBar && (
        <div className="fixed right-0 bottom-0 left-(--sidebar-w) z-[1100] border-t border-card-line bg-surface lg:hidden">
          <div className="mx-auto flex max-w-2xl gap-2.5 px-5 pt-3.5 pb-[max(22px,env(safe-area-inset-bottom))]">
            {actionButtons}
          </div>
        </div>
      )}

      {showSightingForm && (
        <Sheet title="La he visto" onClose={closeSightingForm}>
          <SightingForm
            report={report}
            lastSeen={route[route.length - 1]}
            onCreated={() => {
              setShowSightingForm(false)
              setSightingsVersion((v) => v + 1)
              setToast('¡Gracias! Avistamiento añadido')
            }}
          />
        </Sheet>
      )}

      {toast && (
        <p
          role="status"
          className="fixed bottom-28 left-[calc(50%+var(--sidebar-w)/2)] lg:bottom-10 z-[2100] -translate-x-1/2 rounded-full bg-ink px-4 py-2.5 text-sm font-extrabold text-white shadow-card"
        >
          {toast}
        </p>
      )}
    </main>
  )
}
