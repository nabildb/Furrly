import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { CircleMarker } from 'react-leaflet'
import { useAuth } from '../auth/useAuth'
import { MapView } from '../components/MapView'
import { api } from '../lib/api'
import { speciesLabels } from '../lib/pets'
import { formatDateTime, reportColors, reportStatusLabels, reportTypeLabels, type Report } from '../lib/reports'

export function ReportDetail() {
  const { id } = useParams()
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const { session } = useAuth()

  useEffect(() => {
    api<Report>(`/reports/${id}`)
      .then(setReport)
      .catch((e: Error) => setError(e.message))
  }, [id])

  if (error) return <p className="text-red-600">{error}</p>
  if (!report) return <p>Cargando…</p>

  const isLost = report.type === 'lost'
  // Solo decide si se muestran los botones: quien de verdad lo comprueba es la API.
  const isReporter = session?.user.user_metadata.username === report.reporter.username

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
        </div>
      )}

      <MapView center={report.location} zoom={15}>
        <CircleMarker
          center={report.location}
          radius={10}
          pathOptions={{ color: reportColors[report.type], fillOpacity: 0.6 }}
        />
      </MapView>
    </article>
  )
}
