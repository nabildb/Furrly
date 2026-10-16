import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { SelectField } from '../components/Field'
import { ReportFields } from '../components/ReportFields'
import { api } from '../lib/api'
import { speciesLabels, type Pet } from '../lib/pets'
import { readReportFields, reportTypeLabels, type LatLng, type Report, type ReportType } from '../lib/reports'

export function ReportNew() {
  const navigate = useNavigate()
  const [type, setType] = useState<ReportType>('lost')
  const [pets, setPets] = useState<Pet[] | null>(null)
  const [location, setLocation] = useState<LatLng | null>(null)
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api<Pet[]>('/me/pets')
      .then(setPets)
      .catch((e: Error) => setError(e.message))
  }, [])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!location) {
      setError('Marca en el mapa dónde ocurrió.')
      return
    }
    const form = new FormData(e.currentTarget)
    setSubmitting(true)
    setError(null)
    try {
      const report = await api<Report>('/reports', {
        method: 'POST',
        body: JSON.stringify({
          type,
          ...(type === 'lost' ? { petId: form.get('petId') } : { species: form.get('species') }),
          ...readReportFields(form, location, photoUrls),
        }),
      })
      navigate(`/avisos/${report.id}`)
    } catch (e) {
      setError((e as Error).message)
      setSubmitting(false)
    }
  }

  const petOptions = Object.fromEntries((pets ?? []).map((p) => [p.id, p.name]))
  const noPets = type === 'lost' && pets?.length === 0

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-4 px-4 pt-6 pb-32">
      <h1 className="text-xl font-semibold">Nuevo aviso</h1>

      <div className="flex gap-2">
        {(Object.keys(reportTypeLabels) as ReportType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`rounded border px-4 py-2 text-sm ${type === t ? 'border-black bg-black text-white' : 'border-gray-300'}`}
          >
            {t === 'lost' ? 'He perdido a mi mascota' : 'He encontrado un animal'}
          </button>
        ))}
      </div>

      {type === 'lost' ? (
        pets === null ? (
          <p>Cargando tus mascotas…</p>
        ) : noPets ? (
          <p className="text-sm">
            Para avisar de una pérdida, primero <Link to="/mascotas/nueva" className="underline">añade a tu mascota</Link>.
          </p>
        ) : (
          <SelectField label="¿Quién se ha perdido?" name="petId" options={petOptions} />
        )
      ) : (
        <SelectField label="Especie" name="species" options={speciesLabels} defaultValue="dog" />
      )}

      <ReportFields
        type={type}
        location={location}
        onLocationChange={setLocation}
        photoUrls={photoUrls}
        onPhotosChange={setPhotoUrls}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={submitting || noPets} className="rounded bg-black px-4 py-2 text-white disabled:opacity-50">
        {submitting ? 'Publicando…' : 'Publicar aviso'}
      </button>
    </form>
  )
}
