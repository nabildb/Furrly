import { useState, type FormEvent } from 'react'
import { api } from '../lib/api'
import { toDateTimeInput, type LatLng, type Report } from '../lib/reports'
import { Field, TextAreaField } from './Field'
import { LocationPicker } from './LocationPicker'
import { PhotosInput } from './PhotosInput'

interface SightingFormProps {
  report: Report
  onCreated: () => void
  onCancel: () => void
}

export function SightingForm({ report, onCreated, onCancel }: SightingFormProps) {
  const [location, setLocation] = useState<LatLng | null>(null)
  const [photos, setPhotos] = useState<string[]>([])
  const [maxDate] = useState(() => toDateTimeInput(new Date()))
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!location) {
      setError('Marca en el mapa dónde la viste.')
      return
    }
    const form = new FormData(e.currentTarget)
    setSubmitting(true)
    setError(null)
    try {
      await api(`/reports/${report.id}/sightings`, {
        method: 'POST',
        body: JSON.stringify({
          lat: location.lat,
          lng: location.lng,
          seenAt: new Date(String(form.get('seenAt'))).toISOString(),
          note: form.get('note'),
          photoUrl: photos[0] ?? null,
        }),
      })
      onCreated()
    } catch (e) {
      setError((e as Error).message)
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded border border-amber-300 bg-amber-50 p-4">
      <h3 className="font-semibold">¿Dónde la has visto?</h3>
      <LocationPicker value={location} onChange={setLocation} />
      <Field
        label="¿Cuándo?"
        name="seenAt"
        type="datetime-local"
        required
        min={toDateTimeInput(new Date(report.happenedAt))}
        max={maxDate}
        defaultValue={maxDate}
      />
      <TextAreaField
        label="Nota (opcional)"
        name="note"
        maxLength={300}
        rows={2}
        placeholder="Iba hacia el parque, parecía asustado…"
      />
      <PhotosInput value={photos} onChange={setPhotos} max={1} folder="sightings" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button disabled={submitting} className="rounded bg-amber-500 px-4 py-2 text-sm text-white disabled:opacity-50">
          {submitting ? 'Enviando…' : 'Enviar avistamiento'}
        </button>
        <button type="button" onClick={onCancel} className="text-sm underline">
          Cancelar
        </button>
      </div>
    </form>
  )
}
