import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Circle, Marker, useMap, useMapEvents } from 'react-leaflet'
import { useAuth } from '../auth/useAuth'
import { reportPillIcon, searchCenterIcon } from '../components/mapMarkers'
import { MapView } from '../components/MapView'
import { ReportCard } from '../components/ReportCard'
import { Chip } from '../components/ui/Chip'
import { CountBadge } from '../components/ui/CountBadge'
import { BellIcon, LocateIcon, SearchIcon } from '../components/ui/icons'
import { chipClass } from '../components/ui/styles'
import { TopSearchBar } from '../components/ui/TopSearchBar'
import { useInbox } from '../inbox/useInbox'
import { api } from '../lib/api'
import { cx } from '../lib/cx'
import { searchPlace } from '../lib/geocode'
import { speciesLabels, type Species } from '../lib/pets'
import { DEFAULT_CENTER, reportColors, type LatLng, type NearbyReport, type ReportType } from '../lib/reports'
import { useMediaQuery } from '../lib/useMediaQuery'

const RADII = [2, 5, 10, 25, 50]

interface Filters {
  radiusKm: number
  type: ReportType | ''
  species: Species | ''
}

/** De dónde sale el centro de la búsqueda: cambia el texto del buscador y el "de ti" de las distancias. */
type Origin = { kind: 'default' } | { kind: 'me' } | { kind: 'place'; label: string } | { kind: 'map' }

const originLabels = { default: 'Madrid centro', me: 'Tu ubicación', map: 'Zona del mapa' }

/** Guarda el centro del mapa cuando el usuario lo mueve, para "Buscar en esta zona". */
function TrackCenter({ onMove }: { onMove: (center: LatLng) => void }) {
  const map = useMapEvents({ moveend: () => onMove(map.getCenter()) })
  return null
}

/** Mueve el mapa cuando cambia el centro de búsqueda (ubicación, buscador...). */
function FlyTo({ center }: { center: LatLng }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo(center, map.getZoom())
  }, [map, center])
  return null
}

export function Reports() {
  const { session } = useAuth()
  const inbox = useInbox()
  const [searchCenter, setSearchCenter] = useState<LatLng>(DEFAULT_CENTER)
  const [origin, setOrigin] = useState<Origin>({ kind: 'default' })
  const [mapCenter, setMapCenter] = useState<LatLng>(DEFAULT_CENTER)
  const [filters, setFilters] = useState<Filters>({ radiusKm: 5, type: '', species: '' })
  const [reports, setReports] = useState<NearbyReport[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const cardRefs = useRef(new Map<string, HTMLAnchorElement>())
  // Las tarjetas van en un carrusel (móvil) o en una lista lateral (escritorio): se monta solo una.
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  function locate() {
    if (!navigator.geolocation) return setError('Tu navegador no permite obtener la ubicación.')
    setBusy(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setSearchCenter({ lat: coords.latitude, lng: coords.longitude })
        setOrigin({ kind: 'me' })
        setBusy(false)
      },
      () => {
        setError('No hemos podido obtener tu ubicación. Busca una zona arriba.')
        setBusy(false)
      },
      { timeout: 10000 },
    )
  }

  // Al entrar, intentamos centrar en la ubicación del usuario (si la da).
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(({ coords }) => {
      setSearchCenter({ lat: coords.latitude, lng: coords.longitude })
      setOrigin({ kind: 'me' })
    })
  }, [])

  async function handleSearch(query: string) {
    setBusy(true)
    setError(null)
    try {
      const place = await searchPlace(query)
      if (!place) return setError(`No encontramos "${query}". Prueba con un barrio o una calle.`)
      setSearchCenter(place)
      setOrigin({ kind: 'place', label: place.label })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

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
      .then((data) => {
        if (cancelled) return
        setReports(data)
        setError(null)
      })
      .catch((e: Error) => !cancelled && setError(e.message))
    // Si cambian los filtros antes de que llegue la respuesta, ignoramos la vieja.
    return () => {
      cancelled = true
    }
  }, [searchCenter, filters])

  // Al tocar un marcador, su tarjeta se desliza a la vista (carrusel o lista lateral).
  function selectFromMap(id: string) {
    setSelectedId(id)
    cardRefs.current.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }

  const movedAway =
    Math.abs(mapCenter.lat - searchCenter.lat) > 0.005 || Math.abs(mapCenter.lng - searchCenter.lng) > 0.005
  const place = origin.kind === 'place' ? origin.label : originLabels[origin.kind]
  const typeChips: [Filters['type'], string, string | undefined][] = [
    ['', `Todos · ${filters.radiusKm} km`, undefined],
    ['lost', 'Perdidas', reportColors.lost],
    ['found', 'Encontradas', reportColors.found],
  ]

  const cards = reports?.map((r) => (
    <ReportCard
      key={r.id}
      ref={(el) => {
        if (el) cardRefs.current.set(r.id, el)
        else cardRefs.current.delete(r.id)
      }}
      report={r}
      fromYou={origin.kind === 'me'}
      selected={selectedId === r.id}
      onHover={() => setSelectedId(r.id)}
      className={isDesktop ? undefined : 'w-[290px] flex-none snap-center'}
    />
  ))

  return (
    <main className="fixed inset-y-0 right-0 left-(--sidebar-w) overflow-hidden bg-[#ECEFE7]">
      <h1 className="sr-only">Avisos cerca</h1>
      <MapView center={searchCenter} zoom={14} variant="full">
        <FlyTo center={searchCenter} />
        <TrackCenter onMove={setMapCenter} />
        <Circle
          center={searchCenter}
          radius={filters.radiusKm * 1000}
          pathOptions={{ color: '#1B2430', opacity: 0.28, weight: 2, dashArray: '6 6', fillOpacity: 0.04 }}
        />
        <Marker position={searchCenter} icon={searchCenterIcon} interactive={false} />
        {reports?.map((r) => (
          <Marker
            key={r.id}
            position={r.location}
            icon={reportPillIcon(r.type, r.petName ?? speciesLabels[r.species], r.photoUrl, selectedId === r.id)}
            zIndexOffset={selectedId === r.id ? 1000 : 0}
            title={r.title}
            eventHandlers={{ click: () => selectFromMap(r.id) }}
          />
        ))}
      </MapView>

      {/* Columna flotante: arriba en móvil; panel lateral con la lista en escritorio.
          pointer-events-none deja arrastrar el mapa por los huecos entre elementos. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 bottom-[104px] z-10 flex flex-col gap-2.5 pt-[max(18px,env(safe-area-inset-top))] md:right-auto md:w-[460px] lg:bottom-4 lg:left-4 lg:w-[360px] lg:pt-4 xl:w-[400px]">
        <div className="pointer-events-auto px-4 lg:px-0">
          <TopSearchBar
            place={place}
            onSearch={handleSearch}
            searching={busy}
            action={
              <>
                {session && (
                  <Link
                    to="/notificaciones"
                    aria-label={`Notificaciones${inbox.notifications ? ` (${inbox.notifications} sin leer)` : ''}`}
                    className="relative flex h-11 w-11 flex-none items-center justify-center rounded-[14px] bg-subtle text-ink transition hover:bg-line lg:hidden"
                  >
                    <BellIcon size={20} />
                    <CountBadge count={inbox.notifications} className="absolute -top-1 -right-1 ring-2 ring-surface" />
                  </Link>
                )}
                <button
                  type="button"
                  onClick={locate}
                  aria-label="Usar mi ubicación"
                  className={cx(
                    'flex h-11 w-11 flex-none items-center justify-center rounded-[14px] transition',
                    origin.kind === 'me' ? 'bg-ink text-white' : 'bg-subtle text-ink hover:bg-line',
                  )}
                >
                  <LocateIcon size={20} />
                </button>
              </>
            }
          />
        </div>

        <div
          role="toolbar"
          aria-label="Filtros"
          className="pointer-events-auto flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:flex-wrap lg:px-0"
        >
          {typeChips.map(([type, label, dot]) => (
            <Chip
              key={type || 'all'}
              floating
              active={filters.type === type}
              dot={dot}
              onClick={() => setFilters({ ...filters, type })}
            >
              {label}
            </Chip>
          ))}
          <label className={cx(chipClass(false, true), 'relative pr-8')}>
            <span className="sr-only">Radio de búsqueda</span>
            {filters.radiusKm} km
            <select
              value={filters.radiusKm}
              onChange={(e) => setFilters({ ...filters, radiusKm: Number(e.target.value) })}
              className="absolute inset-0 cursor-pointer opacity-0"
            >
              {RADII.map((km) => (
                <option key={km} value={km}>
                  {km} km
                </option>
              ))}
            </select>
            <span aria-hidden="true" className="absolute right-3 text-xs">
              ▾
            </span>
          </label>
          <label className={cx(chipClass(filters.species !== '', true), 'relative pr-8')}>
            <span className="sr-only">Especie</span>
            {filters.species ? speciesLabels[filters.species] : 'Especie'}
            <select
              value={filters.species}
              onChange={(e) => setFilters({ ...filters, species: e.target.value as Filters['species'] })}
              className="absolute inset-0 cursor-pointer opacity-0"
            >
              <option value="">Todas</option>
              {Object.entries(speciesLabels).map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </select>
            <span aria-hidden="true" className="absolute right-3 text-xs">
              ▾
            </span>
          </label>
        </div>

        {movedAway && (
          <button
            type="button"
            onClick={() => {
              setSearchCenter(mapCenter)
              setOrigin({ kind: 'map' })
            }}
            className="pointer-events-auto mx-auto flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-extrabold text-white shadow-float lg:mx-0 lg:self-start"
          >
            <SearchIcon size={16} /> Buscar en esta zona
          </button>
        )}

        {error && (
          <p role="alert" className="pointer-events-auto mx-4 rounded-2xl bg-surface px-4 py-3 text-sm font-bold text-lost-text shadow-float lg:mx-0">
            {error}
          </p>
        )}

        {isDesktop && (
          <div className="pointer-events-auto flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-1">{cards}</div>
        )}
      </div>

      {!isDesktop && reports && reports.length > 0 && (
        <div className="absolute inset-x-0 bottom-[96px] z-10 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 py-2 [scrollbar-width:none]">
          {cards}
        </div>
      )}

      {reports?.length === 0 && (
        <p className="absolute inset-x-4 bottom-[112px] z-10 mx-auto max-w-sm rounded-card bg-surface p-4 text-center text-[15px] font-semibold text-muted shadow-card lg:right-auto lg:bottom-4 lg:left-4 lg:mx-0 lg:w-[360px] lg:max-w-none xl:w-[400px]">
          <span className="block font-display text-base font-extrabold text-ink">Sin avisos por aquí</span>
          No hay mascotas perdidas ni encontradas en {filters.radiusKm} km. ¡Buenas noticias!
        </p>
      )}
    </main>
  )
}
