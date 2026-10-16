import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { api } from '../lib/api'
import { formatTimeAgo, reportColors, reportStatusLabels, reportTypeLabels, type MyReport } from '../lib/reports'

export function MyReports() {
  const [reports, setReports] = useState<MyReport[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<MyReport[]>('/me/reports')
      .then(setReports)
      .catch((e: Error) => setError(e.message))
  }, [])

  if (error) return <p className="text-red-600">{error}</p>
  if (!reports) return <p>Cargando…</p>

  return (
    <section className="mx-auto max-w-2xl space-y-4 px-4 pt-6 pb-32">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Mis avisos</h1>
        <Link to="/avisos/nuevo" className="rounded bg-black px-3 py-1.5 text-sm text-white">
          Publicar aviso
        </Link>
      </div>
      {reports.length === 0 ? (
        <p className="text-gray-600">No has publicado ningún aviso.</p>
      ) : (
        <ul className="space-y-2">
          {reports.map((r) => (
            <li key={r.id}>
              <Link
                to={`/avisos/${r.id}`}
                className={`flex gap-3 rounded border border-gray-200 p-3 hover:bg-gray-50 ${r.status === 'active' ? '' : 'opacity-60'}`}
              >
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded bg-gray-100">
                  {r.photoUrl && <img src={r.photoUrl} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium">
                    <span style={{ color: reportColors[r.type] }}>{reportTypeLabels[r.type]}</span>
                    {' · '}
                    {reportStatusLabels[r.status]}
                  </p>
                  <p className="truncate font-medium">{r.title}</p>
                  <p className="text-sm text-gray-600">
                    {formatTimeAgo(r.createdAt)}
                    {r.type === 'lost' &&
                      ` · ${r.sightingsCount} ${r.sightingsCount === 1 ? 'avistamiento' : 'avistamientos'}`}
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
