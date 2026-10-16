import { useState, type FormEvent } from 'react'
import { api } from '../lib/api'
import { toDateTimeInput, type LatLng, type Report } from '../lib/reports'
import { ErrorText, Field, TextAreaField } from './Field'
import { LocationPicker } from './LocationPicker'
import { PhotosInput } from './PhotosInput'
import { Button } from './ui/Button'
import { EyeIcon } from './ui/icons'

interface SightingFormProps {
  report: Report
  /** Último punto conocido (avistamiento más reciente o lugar de la pérdida). */
  lastSeen: LatLng
  onCreated: () => void
}

export function SightingForm({ report, lastSeen, onCreated }: SightingFormProps) {
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-[15px] font-semibold text-muted">
        Tu avistamiento se suma al recorrido y avisa a quien la busca. Si puedes, no la persigas: se asustan.
      </p>
      <div>
        <span className="text-sm font-extrabold">¿Dónde la has visto?</span>
        <div className="mt-1.5">
          <LocationPicker value={location} onChange={setLocation} initialCenter={lastSeen} className="h-56" />
        </div>
      </div>
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
        placeholder="Iba hacia el parque, parecía asustada…"
      />
      <PhotosInput value={photos} onChange={setPhotos} max={1} folder="sightings" />
      {error && <ErrorText>{error}</ErrorText>}
      <Button type="submit" variant="sighting" disabled={submitting} className="w-full">
        <EyeIcon /> {submitting ? 'Enviando…' : 'Enviar avistamiento'}
      </Button>
    </form>
  )
}
