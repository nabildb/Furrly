import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { ModerationCounts } from '../lib/moderation'

/** Las cifras de arriba del panel. Si no llegan, el panel funciona igual. */
export function ModerationCountsBar({ refreshKey }: { refreshKey: number }) {
  const [counts, setCounts] = useState<ModerationCounts | null>(null)

  useEffect(() => {
    api<ModerationCounts>('/admin/stats')
      .then(setCounts)
      .catch(() => {})
  }, [refreshKey])

  if (!counts) return null
  const items = [
    ['Pendientes', counts.pending],
    ['Resueltas en 7 días', counts.resolvedLastWeek],
    ['Cuentas suspendidas', counts.suspended],
    ['Decisiones en 7 días', counts.decisionsLastWeek],
  ] as const

  return (
    <dl className="mb-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      {items.map(([label, value]) => (
        <div key={label} className="flex flex-col-reverse rounded-2xl border border-card-line bg-surface px-4 py-3">
          <dt className="text-[13px] font-semibold text-muted">{label}</dt>
          <dd className="font-display text-xl font-extrabold">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
