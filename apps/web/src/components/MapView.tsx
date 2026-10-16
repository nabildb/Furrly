import 'leaflet/dist/leaflet.css'
import type { ReactNode } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import type { LatLng } from '../lib/reports'

// Puerta del Sol: centro por defecto mientras no sabemos dónde está el usuario.
const DEFAULT_CENTER: LatLng = { lat: 40.4168, lng: -3.7038 }

interface MapViewProps {
  center?: LatLng
  zoom?: number
  className?: string
  children?: ReactNode
}

/** Mapa base de OpenStreetMap. Los marcadores y la interacción van como children. */
export function MapView({ center = DEFAULT_CENTER, zoom = 13, className = 'h-72', children }: MapViewProps) {
  return (
    <MapContainer center={center} zoom={zoom} className={`${className} w-full rounded border border-gray-300`}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {children}
    </MapContainer>
  )
}
