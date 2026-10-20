import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useMe } from '../auth/useMe'
import { ErrorText } from '../components/Field'
import { Loading, Page, PageError } from '../components/Page'
import { ReportDetailFields, ReportWhereWhenFields } from '../components/ReportFields'
import { Button } from '../components/ui/Button'
import { api } from '../lib/api'
import { readReportFields, type LatLng, type Report } from '../lib/reports'
import { removeImage } from '../lib/storage'

export function ReportEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { username: myUsername } = useMe()
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

  if (error && !report) return <PageError message={error} />
  if (!report || !location) return <Loading />
  // Hasta saber quién soy (cuentas de Google: llega con /me) no se puede decidir si el aviso es mío.
  if (!myUsername) return <Loading />
  if (report.reporter.username !== myUsername || report.status !== 'active') {
    return <PageError message="Solo puedes editar tus avisos activos." back={`/avisos/${report.id}`} />
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
      navigate(`/avisos/${report.id}`, { replace: true })
    } catch (e) {
      setError((e as Error).message)
      setSubmitting(false)
    }
  }

  async function handleCancel() {
    if (!report) return
    // Las fotos subidas en esta edición no se han guardado: no las dejamos huérfanas.
    await Promise.all(photoUrls.filter((url) => !report.photos.includes(url)).map(removeImage))
    navigate(`/avisos/${report.id}`, { replace: true })
  }

  return (
    <Page title="Editar aviso" back={`/avisos/${report.id}`} bottomSpace={false} width="wide" className="pb-12">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Escritorio: textos y fotos a la izquierda, mapa y fecha a la derecha. */}
        <div className="space-y-5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8 lg:space-y-0">
          <div className="space-y-5">
            <ReportDetailFields type={report.type} initial={report} photoUrls={photoUrls} onPhotosChange={setPhotoUrls} />
          </div>
          <div className="space-y-5">
            <ReportWhereWhenFields type={report.type} initial={report} location={location} onLocationChange={setLocation} />
          </div>
        </div>
        {error && <ErrorText>{error}</ErrorText>}
        <div className="flex gap-2.5 lg:ml-auto lg:max-w-md">
          <Button variant="secondary" onClick={handleCancel} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" variant="dark" disabled={submitting} className="flex-[2]">
            {submitting ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </Page>
  )
}
