import L from 'leaflet'
import { useEffect, useRef, useState } from 'react'
import { CircleMarker, useMap, useMapEvents } from 'react-leaflet'
import type { LatLng } from '../lib/reports'
import { MapView } from './MapView'

interface LocationPickerProps {
  value: LatLng | null
  onChange: (value: LatLng) => void
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
      className="absolute top-2 right-2 z-[1000] rounded bg-white px-3 py-1.5 text-sm shadow"
    >
      {status === 'loading' ? 'Buscando…' : status === 'error' ? 'No se pudo localizar' : 'Usar mi ubicación'}
    </button>
  )
}

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  return (
    <div>
      <div className="relative">
        <MapView center={value ?? undefined}>
          <ClickHandler onChange={onChange} />
          <LocateButton onChange={onChange} />
          {value && <CircleMarker center={value} radius={10} pathOptions={{ color: '#dc2626', fillOpacity: 0.6 }} />}
        </MapView>
      </div>
      <p className="mt-1 text-xs text-gray-500">
        {value ? `Punto marcado: ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}` : 'Haz clic en el mapa para marcar el lugar.'}
      </p>
    </div>
  )
}
