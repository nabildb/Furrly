import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useMe } from '../auth/useMe'
import { ErrorText } from '../components/Field'
import { Loading } from '../components/Page'
import { Button } from '../components/ui/Button'
import { BackIcon, PawIcon } from '../components/ui/icons'
import { LogoMark } from '../components/ui/Logo'
import { iconButtonClass } from '../components/ui/styles'
import { api } from '../lib/api'
import { cx } from '../lib/cx'
import { speciesLabels } from '../lib/pets'
import type { Report } from '../lib/reports'

const longDate = (iso: string) =>
  new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' }).format(new Date(iso))

/**
 * Cartel A4 para imprimir y pegar por el barrio. El QR abre el aviso en Furrly (mapa, avistamientos,
 * «La he visto»). El teléfono y el email solo salen si lo imprime quien publicó el aviso: un vecino
 * puede imprimirlo para ayudar sin repartir los datos de otro.
 */
export function Poster() {
  const { id } = useParams()
  const { username: myUsername } = useMe()
  const [report, setReport] = useState<Report | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const url = `${window.location.origin}/avisos/${id}`

  useEffect(() => {
    api<Report>(`/reports/${id}`)
      .then(setReport)
      .catch((e: Error) => setError(e.message))
    QRCode.toDataURL(url, { margin: 0, width: 600, errorCorrectionLevel: 'M', color: { dark: '#1B2430', light: '#FFFFFF' } })
      .then(setQr)
      .catch(() => setError('No se ha podido generar el código QR'))
  }, [id, url])

  if (error) return <ErrorText>{error}</ErrorText>
  if (!report || !qr) return <Loading label="Preparando el cartel…" />

  const isLost = report.type === 'lost'
  const isMine = myUsername === report.reporter.username
  const photo = report.photos[0] ?? report.pet?.photoUrl
  const name = report.pet?.name ?? speciesLabels[report.species]
  const details = [speciesLabels[report.species], report.pet?.breed].filter(Boolean).join(' · ')
  const contact = isMine ? report.contact : null

  return (
    <main className="min-h-dvh bg-subtle px-4 py-6 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] items-center gap-3 print:hidden">
        <Link to={`/avisos/${report.id}`} aria-label="Volver al aviso" className={iconButtonClass()}>
          <BackIcon size={20} />
        </Link>
        <p className="flex-1 text-sm font-semibold text-muted">
          {contact ? 'Incluye tu teléfono y email del aviso.' : 'El código QR lleva al aviso en Furrly.'}
        </p>
        <Button size="md" onClick={() => window.print()}>
          Imprimir
        </Button>
      </div>

      {/* Hoja A4: en pantalla, una vista previa (en el móvil crece a lo alto para que quepa todo); al imprimir, la página entera. */}
      <article className="mx-auto flex max-w-[210mm] flex-col sm:aspect-[210/297] overflow-hidden bg-white shadow-xl print:aspect-auto print:h-[273mm] print:max-w-none print:shadow-none">
        <header className={cx('px-[6%] py-[3%] text-center text-white [print-color-adjust:exact]', isLost ? 'bg-lost' : 'bg-found')}>
          <p className="font-display text-[clamp(28px,9vw,76px)] leading-none font-extrabold tracking-[-1px]">
            {isLost ? 'SE BUSCA' : 'ENCONTRADO'}
          </p>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-4 px-[6%] py-[4%] sm:gap-[3%]">
          <div className="aspect-[4/3] overflow-hidden rounded-[18px] bg-subtle sm:aspect-auto sm:min-h-0 sm:flex-1 print:aspect-auto print:min-h-0 print:flex-1">
            {photo ? (
              <img src={photo} alt={`Foto de ${name}`} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-muted">
                <PawIcon size={120} />
              </div>
            )}
          </div>

          <div className="text-center">
            <h1 className="font-display text-[clamp(26px,7vw,56px)] leading-tight font-extrabold tracking-[-1px]">{name}</h1>
            {details && <p className="text-[clamp(14px,2.6vw,20px)] font-bold text-muted">{details}</p>}
          </div>

          <p className="line-clamp-3 text-center text-[clamp(14px,2.8vw,22px)] leading-snug font-semibold text-body">
            {report.description}
          </p>

          <p className="text-center text-[clamp(14px,2.8vw,22px)] font-extrabold">
            {isLost ? 'Se perdió' : 'Se encontró'}
            {report.addressText && ` en ${report.addressText}`} · {longDate(report.happenedAt)}
          </p>

          <div className="flex items-center gap-[5%] rounded-[18px] border-2 border-ink p-[3%]">
            <img src={qr} alt="Código QR del aviso" className="aspect-square w-[28%] flex-none" />
            <div className="min-w-0 space-y-1">
              <p className="font-display text-[clamp(16px,3.6vw,30px)] leading-tight font-extrabold">
                {isLost ? '¿La has visto?' : '¿Es tuyo?'}
              </p>
              <p className="text-[clamp(13px,2.4vw,19px)] leading-snug font-semibold text-body">
                Escanea el código para ver el aviso y el mapa, y avisar en Furrly.
              </p>
              {contact?.phone && <p className="font-display text-[clamp(16px,3.6vw,30px)] font-extrabold">☎ {contact.phone}</p>}
              {contact?.email && <p className="truncate text-[clamp(13px,2.4vw,19px)] font-bold">{contact.email}</p>}
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-center gap-2 pb-[3%] text-[clamp(12px,2vw,16px)] font-bold text-muted">
          <LogoMark size={22} /> Furrly · mascotas perdidas y encontradas
        </footer>
      </article>
    </main>
  )
}
