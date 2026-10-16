import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Circle, CircleMarker, Popup, useMap, useMapEvents } from 'react-leaflet'
import { SelectField } from '../components/Field'
import { MapView } from '../components/MapView'
import { api } from '../lib/api'
import { speciesLabels, type Species } from '../lib/pets'
import {
  DEFAULT_CENTER,
  formatDistance,
  formatTimeAgo,
  reportColors,
  reportTypeLabels,
  type LatLng,
  type NearbyReport,
  type ReportType,
} from '../lib/reports'

const radiusOptions = { '2': '2 km', '5': '5 km', '10': '10 km', '25': '25 km', '50': '50 km' }
const typeOptions = { '': 'Todos', ...reportTypeLabels }
const speciesOptions = { '': 'Todas', ...speciesLabels }

interface Filters {
  radiusKm: number
  type: ReportType | ''
  species: Species | ''
}

/** Guarda el centro del mapa cuando el usuario lo mueve, para "Buscar en esta zona". */
function TrackCenter({ onMove }: { onMove: (center: LatLng) => void }) {
  const map = useMapEvents({ moveend: () => onMove(map.getCenter()) })
  return null
}

/** Mueve el mapa cuando cambia el centro de búsqueda (p. ej. al obtener la ubicación). */
function FlyTo({ center }: { center: LatLng }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo(center, map.getZoom())
  }, [map, center])
  return null
}

export function Reports() {
  const [searchCenter, setSearchCenter] = useState<LatLng>(DEFAULT_CENTER)
  const [mapCenter, setMapCenter] = useState<LatLng>(DEFAULT_CENTER)
  const [filters, setFilters] = useState<Filters>({ radiusKm: 5, type: '', species: '' })
  const [reports, setReports] = useState<NearbyReport[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Al entrar, intentamos centrar en la ubicación del usuario (si la da).
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(({ coords }) =>
      setSearchCenter({ lat: coords.latitude, lng: coords.longitude }),
    )
  }, [])

  useEffect(() => {
    const params = new URLSearchParams({
      lat: String(searchCenter.lat),
      lng: String(searchCenter.lng),
      radiusKm: String(filters.radiusKm),
    })
    if (filters.type) params.set('type', filters.type)
    if (filters.species) params.set('species', filters.species)

    let cancelled = false
    api<NearbyReport[]>(`/reports?${params}`)
      .then((data) => !cancelled && setReports(data))
      .catch((e: Error) => !cancelled && setError(e.message))
    // Si cambian los filtros antes de que llegue la respuesta, ignoramos la vieja.
    return () => {
      cancelled = true
    }
  }, [searchCenter, filters])

  const movedAway =
    Math.abs(mapCenter.lat - searchCenter.lat) > 0.005 || Math.abs(mapCenter.lng - searchCenter.lng) > 0.005

  return (
    <section className="mx-auto max-w-2xl space-y-4 px-4 pt-6 pb-32">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Avisos cerca</h1>
        <Link to="/avisos/nuevo" className="rounded bg-black px-3 py-1.5 text-sm text-white">
          Publicar aviso
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <SelectField
          label="Radio"
          options={radiusOptions}
          value={String(filters.radiusKm)}
          onChange={(e) => setFilters({ ...filters, radiusKm: Number(e.target.value) })}
        />
        <SelectField
          label="Tipo"
          options={typeOptions}
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value as Filters['type'] })}
        />
        <SelectField
          label="Especie"
          options={speciesOptions}
          value={filters.species}
          onChange={(e) => setFilters({ ...filters, species: e.target.value as Filters['species'] })}
        />
      </div>

      <div className="relative">
        <MapView center={searchCenter} zoom={13} className="h-96">
          <FlyTo center={searchCenter} />
          <TrackCenter onMove={setMapCenter} />
          <Circle
            center={searchCenter}
            radius={filters.radiusKm * 1000}
            pathOptions={{ color: '#6b7280', weight: 1, fillOpacity: 0.05 }}
          />
          {reports?.map((r) => (
            <CircleMarker
              key={r.id}
              center={r.location}
              radius={9}
              pathOptions={{ color: reportColors[r.type], fillOpacity: 0.7 }}
            >
              <Popup>
                <Link to={`/avisos/${r.id}`} className="font-medium">
                  {r.title}
                </Link>
                <br />
                {reportTypeLabels[r.type]} · {formatDistance(r.distanceM)}
              </Popup>
            </CircleMarker>
          ))}
        </MapView>
        {movedAway && (
          <button
            onClick={() => setSearchCenter(mapCenter)}
            className="absolute top-2 left-1/2 z-[1000] -translate-x-1/2 rounded bg-white px-3 py-1.5 text-sm shadow"
          >
            Buscar en esta zona
          </button>
        )}
      </div>

      {error && <p className="text-red-600">{error}</p>}
      {!reports ? (
        <p>Cargando avisos…</p>
      ) : reports.length === 0 ? (
        <p className="text-gray-600">No hay avisos activos en esta zona. ¡Buenas noticias!</p>
      ) : (
        <ul className="space-y-2">
          {reports.map((r) => (
            <li key={r.id}>
              <Link to={`/avisos/${r.id}`} className="flex gap-3 rounded border border-gray-200 p-3 hover:bg-gray-50">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded bg-gray-100">
                  {r.photoUrl && <img src={r.photoUrl} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium" style={{ color: reportColors[r.type] }}>
                    {reportTypeLabels[r.type]} · {speciesLabels[r.species]}
                  </p>
                  <p className="truncate font-medium">{r.title}</p>
                  <p className="text-sm text-gray-600">
                    a {formatDistance(r.distanceM)}
                    {r.addressText && ` · ${r.addressText}`} · {formatTimeAgo(r.happenedAt)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
