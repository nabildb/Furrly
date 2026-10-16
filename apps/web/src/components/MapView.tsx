import 'leaflet/dist/leaflet.css'
import { useEffect, type ReactNode } from 'react'
import { MapContainer, TileLayer, useMap, ZoomControl } from 'react-leaflet'
import { cx } from '../lib/cx'
import { DEFAULT_CENTER, type LatLng } from '../lib/reports'

interface MapViewProps {
  center?: LatLng
  zoom?: number
  className?: string
  /** 'card': mapa pequeño con bordes redondeados; 'full': ocupa toda la pantalla. */
  variant?: 'card' | 'full'
  interactive?: boolean
  children?: ReactNode
}

/**
 * Leaflet calcula su tamaño al montarse: si el contenedor cambia después (un paso del asistente
 * que estaba oculto, girar el móvil...) hay que avisarle o se queda con teselas grises.
 */
function InvalidateOnResize() {
  const map = useMap()
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(map.getContainer())
    return () => observer.disconnect()
  }, [map])
  return null
}

/**
 * Mapa base de OpenStreetMap (gratis y sin clave). Sus colores se suavizan con un filtro CSS
 * sobre las teselas (ver index.css) para que destaquen los marcadores naranja/azul del diseño.
 */
export function MapView({
  center = DEFAULT_CENTER,
  zoom = 13,
  className,
  variant = 'card',
  interactive = true,
  children,
}: MapViewProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      zoomControl={false}
      dragging={interactive}
      scrollWheelZoom={interactive}
      doubleClickZoom={interactive}
      touchZoom={interactive}
      keyboard={interactive}
      // isolate: las capas de Leaflet usan z-index hasta 1000; así no tapan lo que flota encima.
      className={cx(
        'isolate w-full bg-[#ECEFE7]',
        variant === 'card' ? 'h-72 rounded-[18px]' : 'h-full',
        className,
      )}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      {/* En móvil se hace zoom con los dedos; los botones solo estorban. */}
      {interactive && <ZoomControl position="bottomright" />}
      <InvalidateOnResize />
      {children}
    </MapContainer>
  )
}
