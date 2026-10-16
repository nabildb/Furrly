import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { CircleMarker, Polyline, Tooltip, useMap } from 'react-leaflet'
import { useAuth } from '../auth/useAuth'
import { MapView } from '../components/MapView'
import { SightingForm } from '../components/SightingForm'
import { api } from '../lib/api'
import { speciesLabels } from '../lib/pets'
import {
  formatDateTime,
  formatTimeAgo,
  reportColors,
  reportStatusLabels,
  reportTypeLabels,
  SIGHTING_COLOR,
  type LatLng,
  type Report,
  type Sighting,
} from '../lib/reports'
import { removeImage } from '../lib/storage'

/** Ajusta el zoom para que se vea todo el recorrido. */
function FitRoute({ points }: { points: LatLng[] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points.map((p) => [p.lat, p.lng]), { padding: [30, 30], maxZoom: 16 })
  }, [map, points])
  return null
}

export function ReportDetail() {
  const { id } = useParams()
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [sightings, setSightings] = useState<Sighting[]>([])
  const [sightingsVersion, setSightingsVersion] = useState(0)
  const [showSightingForm, setShowSightingForm] = useState(false)
  const { session } = useAuth()
  const myUsername = session?.user.user_metadata.username as string | undefined

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
      .catch((e: Error) => setError(e.message))
  }, [id, isLostReport, sightingsVersion])

  // Recorrido: del punto de la pérdida a cada avistamiento, en orden cronológico.
  // Memorizado para que el mapa no se reencuadre en cada render.
  const route = useMemo(
    () => (report ? [report.location, ...sightings.map((s) => s.location)] : []),
    [report, sightings],
  )

  if (error) return <p className="text-red-600">{error}</p>
  if (!report) return <p>Cargando…</p>

  const isLost = report.type === 'lost'
  // Solo decide si se muestran los botones: quien de verdad lo comprueba es la API.
  const isReporter = myUsername === report.reporter.username

  async function changeStatus(status: 'resolved' | 'cancelled') {
    const question =
      status === 'resolved'
        ? '¿Marcar el aviso como resuelto? Dejará de aparecer en el mapa.'
        : '¿Cancelar el aviso? Dejará de aparecer en el mapa.'
    if (!report || !confirm(question)) return
    setUpdating(true)
    try {
      setReport(await api<Report>(`/reports/${report.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }))
    } catch (e) {
      setError((e as Error).message)
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
      setError((e as Error).message)
    }
  }

  const photos = report.photos.length > 0 ? report.photos : report.pet?.photoUrl ? [report.pet.photoUrl] : []

  return (
    <article className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
        <span className={`rounded px-2 py-0.5 text-white ${isLost ? 'bg-red-600' : 'bg-green-600'}`}>
          {reportTypeLabels[report.type]}
        </span>
        <span className="rounded bg-gray-200 px-2 py-0.5">{speciesLabels[report.species]}</span>
        {report.status !== 'active' && (
          <span className="rounded bg-gray-800 px-2 py-0.5 text-white">{reportStatusLabels[report.status]}</span>
        )}
      </div>

      <h1 className="text-2xl font-semibold">{report.title}</h1>
      <p className="text-sm text-gray-600">
        {isLost ? 'Se perdió' : 'Encontrado'} el {formatDateTime(report.happenedAt)}
        {report.addressText && ` · ${report.addressText}`} · aviso de @{report.reporter.username}
      </p>

      {photos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto">
          {photos.map((url) => (
            <img key={url} src={url} alt="" className="h-40 w-40 shrink-0 rounded object-cover" />
          ))}
        </div>
      )}

      {report.pet && (
        <p className="text-sm">
          Mascota: <strong>{report.pet.name}</strong>
          {report.pet.breed && ` (${report.pet.breed})`}
        </p>
      )}

      <p className="whitespace-pre-line">{report.description}</p>

      {report.status === 'resolved' && report.resolvedAt && (
        <p className="rounded bg-green-50 p-3 text-sm text-green-800">
          {isLost ? '¡Ya está en casa!' : '¡Ya ha vuelto con su familia!'} Resuelto el {formatDateTime(report.resolvedAt)}.
        </p>
      )}

      {isReporter && report.status === 'active' && (
        <div className="flex gap-3">
          <button
            onClick={() => changeStatus('resolved')}
            disabled={updating}
            className="rounded bg-green-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {isLost ? '¡Ya está en casa!' : 'Ya está con su familia'}
          </button>
          <button
            onClick={() => changeStatus('cancelled')}
            disabled={updating}
            className="rounded border border-gray-300 px-4 py-2 text-sm disabled:opacity-50"
          >
            Cancelar aviso
          </button>
          <Link to={`/avisos/${report.id}/editar`} className="self-center text-sm underline">
            Editar
          </Link>
        </div>
      )}

      <MapView center={report.location} zoom={15}>
        <FitRoute points={route} />
        {sightings.length > 0 && (
          <Polyline positions={route} pathOptions={{ color: SIGHTING_COLOR, dashArray: '6 6', weight: 3 }} />
        )}
        <CircleMarker center={report.location} radius={10} pathOptions={{ color: reportColors[report.type], fillOpacity: 0.6 }}>
          <Tooltip>{isLost ? 'Se perdió aquí' : 'Encontrado aquí'}</Tooltip>
        </CircleMarker>
        {sightings.map((s, i) => (
          <CircleMarker key={s.id} center={s.location} radius={8} pathOptions={{ color: SIGHTING_COLOR, fillOpacity: 0.8 }}>
            <Tooltip permanent direction="top" offset={[0, -6]}>
              {i + 1}
            </Tooltip>
          </CircleMarker>
        ))}
      </MapView>

      {isLost && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Avistamientos ({sightings.length})</h2>
            {report.status === 'active' &&
              !showSightingForm &&
              (session ? (
                <button onClick={() => setShowSightingForm(true)} className="rounded bg-amber-500 px-3 py-1.5 text-sm text-white">
                  La he visto
                </button>
              ) : (
                <Link to="/login" className="text-sm underline">
                  Entra para avisar si la has visto
                </Link>
              ))}
          </div>

          {showSightingForm && (
            <SightingForm
              report={report}
              onCancel={() => setShowSightingForm(false)}
              onCreated={() => {
                setShowSightingForm(false)
                setSightingsVersion((v) => v + 1)
              }}
            />
          )}

          {sightings.length === 0 ? (
            <p className="text-sm text-gray-600">Nadie ha avisado todavía de que la haya visto.</p>
          ) : (
            <ol className="space-y-2">
              {sightings.map((s, i) => (
                <li key={s.id} className="flex gap-3 rounded border border-gray-200 p-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs text-white">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1 text-sm">
                    <p>
                      <strong>{formatDateTime(s.seenAt)}</strong>{' '}
                      <span className="text-gray-500">
                        ({formatTimeAgo(s.seenAt)}) · @{s.user.username}
                      </span>
                    </p>
                    {s.note && <p className="mt-1">{s.note}</p>}
                    {s.photoUrl && <img src={s.photoUrl} alt="" className="mt-2 h-24 w-24 rounded object-cover" />}
                  </div>
                  {(s.user.username === myUsername || isReporter) && (
                    <button onClick={() => deleteSighting(s)} className="self-start text-xs text-red-600 underline">
                      Borrar
                    </button>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </article>
  )
}
