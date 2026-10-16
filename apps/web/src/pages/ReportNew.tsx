import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Field, SelectField, TextAreaField } from '../components/Field'
import { LocationPicker } from '../components/LocationPicker'
import { PhotosInput } from '../components/PhotosInput'
import { api } from '../lib/api'
import { speciesLabels, type Pet } from '../lib/pets'
import { reportTypeLabels, type LatLng, type Report, type ReportType } from '../lib/reports'

/** Valor para <input type="datetime-local"> con la hora local actual. */
function nowForInput() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}

export function ReportNew() {
  const navigate = useNavigate()
  const [type, setType] = useState<ReportType>('lost')
  const [pets, setPets] = useState<Pet[] | null>(null)
  const [location, setLocation] = useState<LatLng | null>(null)
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [maxDate] = useState(nowForInput)
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
          title: form.get('title'),
          description: form.get('description'),
          addressText: form.get('addressText'),
          // datetime-local no lleva zona horaria: el navegador la interpreta como hora local.
          happenedAt: new Date(String(form.get('happenedAt'))).toISOString(),
          lat: location.lat,
          lng: location.lng,
          photoUrls,
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
    <form onSubmit={handleSubmit} className="space-y-4">
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

      <Field
        label="Título"
        name="title"
        required
        minLength={3}
        maxLength={100}
        placeholder={type === 'lost' ? 'Se ha perdido Toby en el Retiro' : 'Gato atigrado encontrado en Lavapiés'}
      />
      <TextAreaField
        label="Descripción"
        name="description"
        required
        minLength={10}
        maxLength={2000}
        rows={4}
        placeholder="Señas, collar, carácter, si se deja coger…"
      />
      <Field label="¿Cuándo?" name="happenedAt" type="datetime-local" required max={maxDate} defaultValue={maxDate} />

      <div>
        <span className="text-sm font-medium">{type === 'lost' ? '¿Dónde se perdió?' : '¿Dónde lo encontraste?'}</span>
        <div className="mt-1">
          <LocationPicker value={location} onChange={setLocation} />
        </div>
      </div>
      <Field label="Zona o dirección (opcional)" name="addressText" maxLength={200} placeholder="Parque del Retiro, puerta de Alcalá" />

      <PhotosInput value={photoUrls} onChange={setPhotoUrls} max={3} folder="reports" />

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={submitting || noPets} className="rounded bg-black px-4 py-2 text-white disabled:opacity-50">
        {submitting ? 'Publicando…' : 'Publicar aviso'}
      </button>
    </form>
  )
}
