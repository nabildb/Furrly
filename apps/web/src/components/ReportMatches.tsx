import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { api } from '../lib/api'
import { formatDistance, formatTimeAgo, type ReportType } from '../lib/reports'
import { Card, SectionTitle } from './ui/Card'
import { ArrowRightIcon, PawIcon } from './ui/icons'

interface Match {
  id: string
  type: ReportType
  title: string
  addressText: string | null
  happenedAt: string
  distanceM: number
  photoUrl: string | null
  petName: string | null
}

/**
 * «Puede que sea el mismo»: avisos del tipo contrario (perdido ↔ encontrado) de la misma especie,
 * cerca y con fechas que encajan (la API decide cuáles; ver lib/matches.ts). Si no hay, no se muestra.
 */
export function ReportMatches({ reportId, type }: { reportId: string; type: ReportType }) {
  const [matches, setMatches] = useState<Match[]>([])

  useEffect(() => {
    api<Match[]>(`/reports/${reportId}/matches`)
      .then(setMatches)
      .catch(() => setMatches([]))
  }, [reportId])

  if (matches.length === 0) return null
  return (
    <Card className="space-y-3 border-2 border-sighting">
      <div>
        <SectionTitle>Puede que sea el mismo</SectionTitle>
        <p className="mt-1 text-sm font-semibold text-muted">
          {type === 'lost'
            ? 'Alguien ha encontrado un animal parecido cerca de aquí. Échale un vistazo:'
            : 'Hay una mascota perdida parecida cerca de aquí. ¿Será esta?'}
        </p>
      </div>
      <ul className="divide-y divide-card-line">
        {matches.map((m) => (
          <li key={m.id}>
            <Link to={`/avisos/${m.id}`} className="flex items-center gap-3 py-2.5 transition hover:opacity-80">
              <span className="flex h-14 w-14 flex-none items-center justify-center overflow-hidden rounded-xl bg-subtle text-muted">
                {m.photoUrl ? <img src={m.photoUrl} alt="" className="h-full w-full object-cover" /> : <PawIcon size={24} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-extrabold">{m.title}</span>
                <span className="block truncate text-sm font-semibold text-muted">
                  {m.type === 'found' ? 'Encontrado' : 'Perdido'} a {formatDistance(m.distanceM)} · {formatTimeAgo(m.happenedAt)}
                </span>
              </span>
              <ArrowRightIcon size={18} className="flex-none text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}
