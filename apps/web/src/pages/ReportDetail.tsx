import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { CircleMarker } from 'react-leaflet'
import { MapView } from '../components/MapView'
import { api } from '../lib/api'
import { speciesLabels } from '../lib/pets'
import { formatDateTime, reportStatusLabels, reportTypeLabels, type Report } from '../lib/reports'

export function ReportDetail() {
  const { id } = useParams()
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<Report>(`/reports/${id}`)
      .then(setReport)
      .catch((e: Error) => setError(e.message))
  }, [id])

  if (error) return <p className="text-red-600">{error}</p>
  if (!report) return <p>Cargando…</p>

  const isLost = report.type === 'lost'
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

      <MapView center={report.location} zoom={15}>
        <CircleMarker
          center={report.location}
          radius={10}
          pathOptions={{ color: isLost ? '#dc2626' : '#16a34a', fillOpacity: 0.6 }}
        />
      </MapView>
    </article>
  )
}
