import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { ReportFields } from '../components/ReportFields'
import { api } from '../lib/api'
import { readReportFields, type LatLng, type Report } from '../lib/reports'
import { removeImage } from '../lib/storage'

export function ReportEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const [report, setReport] = useState<Report | null>(null)
  const [location, setLocation] = useState<LatLng | null>(null)
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api<Report>(`/reports/${id}`)
      .then((r) => {
        setReport(r)
        setLocation(r.location)
        setPhotoUrls(r.photos)
      })
      .catch((e: Error) => setError(e.message))
  }, [id])

  if (error && !report) return <p className="text-red-600">{error}</p>
  if (!report || !location) return <p>Cargando…</p>
  if (report.reporter.username !== session?.user.user_metadata.username || report.status !== 'active') {
    return <p>Solo puedes editar tus avisos activos.</p>
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!report || !location) return
    setSubmitting(true)
    setError(null)
    try {
      await api<Report>(`/reports/${report.id}`, {
        method: 'PATCH',
        body: JSON.stringify(readReportFields(new FormData(e.currentTarget), location, photoUrls)),
      })
      // Ya guardado: ahora sí borramos de Storage las fotos que se han quitado.
      await Promise.all(report.photos.filter((url) => !photoUrls.includes(url)).map(removeImage))
      navigate(`/avisos/${report.id}`)
    } catch (e) {
      setError((e as Error).message)
      setSubmitting(false)
    }
  }

  async function handleCancel() {
    if (!report) return
    // Las fotos subidas en esta edición no se han guardado: no las dejamos huérfanas.
    await Promise.all(photoUrls.filter((url) => !report.photos.includes(url)).map(removeImage))
    navigate(`/avisos/${report.id}`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h1 className="text-xl font-semibold">Editar aviso</h1>
      <ReportFields
        type={report.type}
        initial={report}
        location={location}
        onLocationChange={setLocation}
        photoUrls={photoUrls}
        onPhotosChange={setPhotoUrls}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-4">
        <button disabled={submitting} className="rounded bg-black px-4 py-2 text-white disabled:opacity-50">
          {submitting ? 'Guardando…' : 'Guardar cambios'}
        </button>
        <button type="button" onClick={handleCancel} className="text-sm underline">
          Cancelar
        </button>
      </div>
    </form>
  )
}
