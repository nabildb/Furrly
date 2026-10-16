import { useState } from 'react'
import { toDateTimeInput, type LatLng, type Report, type ReportType } from '../lib/reports'
import { Field, TextAreaField } from './Field'
import { LocationPicker } from './LocationPicker'
import { PhotosInput } from './PhotosInput'

interface ReportFieldsProps {
  type: ReportType
  location: LatLng | null
  onLocationChange: (value: LatLng) => void
  photoUrls: string[]
  onPhotosChange: (urls: string[]) => void
  /** Al editar: valores actuales del aviso. */
  initial?: Report
}

/** Campos comunes de crear y editar un aviso (todo menos el tipo y la mascota). */
export function ReportFields({ type, location, onLocationChange, photoUrls, onPhotosChange, initial }: ReportFieldsProps) {
  const [maxDate] = useState(() => toDateTimeInput(new Date()))
  const isLost = type === 'lost'

  return (
    <>
      <Field
        label="Título"
        name="title"
        required
        minLength={3}
        maxLength={100}
        defaultValue={initial?.title}
        placeholder={isLost ? 'Se ha perdido Toby en el Retiro' : 'Gato atigrado encontrado en Lavapiés'}
      />
      <TextAreaField
        label="Descripción"
        name="description"
        required
        minLength={10}
        maxLength={2000}
        rows={4}
        defaultValue={initial?.description}
        placeholder="Señas, collar, carácter, si se deja coger…"
      />
      <Field
        label="¿Cuándo?"
        name="happenedAt"
        type="datetime-local"
        required
        max={maxDate}
        defaultValue={initial ? toDateTimeInput(new Date(initial.happenedAt)) : maxDate}
      />

      <div>
        <span className="text-sm font-medium">{isLost ? '¿Dónde se perdió?' : '¿Dónde lo encontraste?'}</span>
        <div className="mt-1">
          <LocationPicker value={location} onChange={onLocationChange} />
        </div>
      </div>
      <Field
        label="Zona o dirección (opcional)"
        name="addressText"
        maxLength={200}
        defaultValue={initial?.addressText ?? ''}
        placeholder="Parque del Retiro, puerta de Alcalá"
      />

      <PhotosInput value={photoUrls} onChange={onPhotosChange} max={3} folder="reports" keep={initial?.photos} />
    </>
  )
}
