import { useState, type Ref } from 'react'
import { toDateTimeInput, type LatLng, type Report, type ReportType } from '../lib/reports'
import { Field, TextAreaField } from './Field'
import { LocationPicker } from './LocationPicker'
import { PhotosInput } from './PhotosInput'

// Campos comunes de crear (asistente, pasos 2 y 3) y editar un aviso.
// Son no controlados: la página los lee con FormData (ver readReportFields).

interface WhereWhenProps {
  type: ReportType
  location: LatLng | null
  onLocationChange: (value: LatLng) => void
  /** Al editar: valores actuales del aviso. */
  initial?: Report
}

export function ReportWhereWhenFields({ type, location, onLocationChange, initial }: WhereWhenProps) {
  const [maxDate] = useState(() => toDateTimeInput(new Date()))
  const isLost = type === 'lost'

  return (
    <>
      <div>
        <span className="text-sm font-extrabold">{isLost ? '¿Dónde se perdió?' : '¿Dónde lo encontraste?'}</span>
        <div className="mt-1.5">
          <LocationPicker value={location} onChange={onLocationChange} tone={type} className="h-72" />
        </div>
      </div>
      <Field
        label="Zona o dirección (opcional)"
        name="addressText"
        maxLength={200}
        defaultValue={initial?.addressText ?? ''}
        placeholder="Parque del Retiro, puerta de Alcalá"
        hint="Ayuda a los vecinos a situarse sin abrir el mapa."
      />
      <Field
        label="¿Cuándo?"
        name="happenedAt"
        type="datetime-local"
        required
        max={maxDate}
        defaultValue={initial ? toDateTimeInput(new Date(initial.happenedAt)) : maxDate}
      />
    </>
  )
}

interface DetailsProps {
  type: ReportType
  photoUrls: string[]
  onPhotosChange: (urls: string[]) => void
  initial?: Report
  titleRef?: Ref<HTMLInputElement>
}

export function ReportDetailFields({ type, photoUrls, onPhotosChange, initial, titleRef }: DetailsProps) {
  const isLost = type === 'lost'
  return (
    <>
      <Field
        ref={titleRef}
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
        rows={5}
        defaultValue={initial?.description}
        placeholder="Señas, collar, carácter, si se deja coger…"
        hint="Mínimo 10 caracteres."
      />
      <PhotosInput value={photoUrls} onChange={onPhotosChange} max={3} folder="reports" keep={initial?.photos} />
    </>
  )
}
