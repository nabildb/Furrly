import type { Ref } from 'react'
import { Link } from 'react-router'
import { cx } from '../lib/cx'
import { speciesLabels } from '../lib/pets'
import { formatDistance, formatTimeAgo, reportTypeLabels, type NearbyReport } from '../lib/reports'
import { Badge } from './ui/Badge'
import { PawIcon } from './ui/icons'

interface ReportCardProps {
  report: NearbyReport
  /** "a 350 m de ti" solo tiene sentido si el centro de la búsqueda es tu ubicación. */
  fromYou: boolean
  selected?: boolean
  onHover?: () => void
  className?: string
  ref?: Ref<HTMLAnchorElement>
}

/** Tarjeta flotante de un aviso sobre el mapa (carrusel en móvil, lista lateral en escritorio). */
export function ReportCard({ report: r, fromYou, selected, onHover, className, ref }: ReportCardProps) {
  const isLost = r.type === 'lost'
  const name = r.petName ?? r.title
  const where = r.addressText ?? speciesLabels[r.species]

  return (
    <Link
      ref={ref}
      to={`/avisos/${r.id}`}
      onMouseEnter={onHover}
      onFocus={onHover}
      className={cx(
        'flex gap-3 rounded-card bg-surface p-3 text-ink shadow-card ring-2 transition',
        selected ? (isLost ? 'ring-lost' : 'ring-found') : 'ring-transparent',
        className,
      )}
    >
      <div
        className={cx(
          'flex h-24 w-[84px] flex-none items-center justify-center overflow-hidden rounded-2xl',
          isLost ? 'bg-[#F6D9C8] text-lost/40' : 'bg-[#D5E2F5] text-found/40',
        )}
      >
        {/* lazy: las tarjetas que quedan fuera del carrusel no descargan su foto hasta que se ven. */}
        {r.photoUrl ? (
          <img src={r.photoUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
        ) : (
          <PawIcon size={36} />
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-1 pt-0.5">
        <Badge tone={r.type} className="self-start">
          {reportTypeLabels[r.type]}
        </Badge>
        <span className="line-clamp-2 font-display text-[17px] leading-[1.15] font-extrabold">{name}</span>
        <span className="truncate text-sm font-semibold text-muted">
          {where} · {formatTimeAgo(r.happenedAt)}
        </span>
        <span className={cx('text-[13px] font-extrabold', isLost ? 'text-lost-text' : 'text-found-text')}>
          a {formatDistance(r.distanceM)}
          {fromYou && ' de ti'}
        </span>
      </div>
    </Link>
  )
}
