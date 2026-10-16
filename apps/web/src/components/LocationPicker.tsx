import L from 'leaflet'
import { useEffect, useRef, useState } from 'react'
import { Marker, useMap, useMapEvents } from 'react-leaflet'
import { cx } from '../lib/cx'
import type { LatLng, ReportType } from '../lib/reports'
import { originIcon } from './mapMarkers'
import { MapView } from './MapView'
import { LocateIcon } from './ui/icons'

interface LocationPickerProps {
  value: LatLng | null
  onChange: (value: LatLng) => void
  /** Color del punto marcado: naranja (perdida), azul (encontrada). */
  tone?: ReportType
  /** Dónde abrir el mapa mientras no hay punto marcado (p. ej. el recorrido de la mascota). */
  initialCenter?: LatLng
  className?: string
}

/** Escucha los clics en el mapa. Tiene que vivir dentro de <MapContainer>. */
function ClickHandler({ onChange }: { onChange: (value: LatLng) => void }) {
  useMapEvents({ click: (e) => onChange({ lat: e.latlng.lat, lng: e.latlng.lng }) })
  return null
}

function LocateButton({ onChange }: { onChange: (value: LatLng) => void }) {
  const map = useMap()
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const ref = useRef<HTMLButtonElement>(null)

  // Leaflet escucha los clics con eventos nativos: sin esto, pulsar el botón
  // también marcaría un punto en el mapa.
  useEffect(() => {
    if (ref.current) L.DomEvent.disableClickPropagation(ref.current)
  }, [])

  function locate() {
    if (!navigator.geolocation) return setStatus('error')
    setStatus('loading')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const point = { lat: coords.latitude, lng: coords.longitude }
        onChange(point)
        map.flyTo(point, 16)
        setStatus('idle')
      },
      () => setStatus('error'),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={locate}
      className="absolute top-3 right-3 z-[1000] flex h-10 items-center gap-1.5 rounded-full bg-surface px-3.5 text-sm font-extrabold text-ink shadow-chip"
    >
      <LocateIcon size={18} />
      {status === 'loading' ? 'Buscando…' : status === 'error' ? 'No se pudo localizar' : 'Usar mi ubicación'}
    </button>
  )
}

export function LocationPicker({ value, onChange, tone = 'lost', initialCenter, className }: LocationPickerProps) {
  return (
    <div>
      <div className="relative">
        <MapView center={value ?? initialCenter} zoom={value || initialCenter ? 15 : 13} className={cx('cursor-crosshair', className)}>
          <ClickHandler onChange={onChange} />
          <LocateButton onChange={onChange} />
          {value && <Marker position={value} icon={originIcon(tone)} interactive={false} />}
        </MapView>
      </div>
      <p className={cx('mt-1.5 text-[13px] font-semibold', value ? 'text-muted' : 'text-lost-text')}>
        {value ? 'Punto marcado. Toca el mapa para cambiarlo.' : 'Toca el mapa para marcar el lugar.'}
      </p>
    </div>
  )
}
