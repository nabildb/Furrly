import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'
import type { ReportStatus, ReportType } from '../../lib/reports'

export type BadgeTone = ReportType | Exclude<ReportStatus, 'active'> | 'neutral'

const tones: Record<BadgeTone, string> = {
  lost: 'bg-lost-soft text-lost-text',
  found: 'bg-found-soft text-found-text',
  resolved: 'bg-resolved-soft text-resolved-text',
  cancelled: 'bg-subtle text-muted',
  neutral: 'bg-subtle text-ink',
}

const solidTones: Partial<Record<BadgeTone, string>> = {
  lost: 'bg-lost text-white',
  found: 'bg-found text-white',
}

interface BadgeProps {
  tone: BadgeTone
  /** Versión rellena y en mayúsculas (cabecera de la ficha). */
  solid?: boolean
  children: ReactNode
  className?: string
}

export function Badge({ tone, solid, children, className }: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-lg px-2.5 py-1 text-xs leading-none font-extrabold',
        solid ? cx(solidTones[tone] ?? tones[tone], 'tracking-[0.5px] uppercase') : tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
