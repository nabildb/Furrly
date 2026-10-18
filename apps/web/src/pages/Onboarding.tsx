import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { ErrorText } from '../components/Field'
import { LocationPicker } from '../components/LocationPicker'
import { PushToggle } from '../components/PushToggle'
import { Button } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'
import { LogoMark } from '../components/ui/Logo'
import { markAccountReady } from '../lib/accountGate'
import { api } from '../lib/api'
import { cx } from '../lib/cx'
import { safeRedirect } from '../lib/redirect'
import type { LatLng } from '../lib/reports'

const RADII = [1, 2, 5, 10]
const STEPS = ['Tu zona', 'Avisos', 'Tu mascota'] as const

/**
 * Guía de primeros pasos para cuentas nuevas: sin zona de alertas no te llega ningún aviso de
 * mascotas perdidas cerca, y la app no sirve de mucho. Cada paso se puede saltar.
 */
export function Onboarding() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const next = safeRedirect(useSearchParams()[0].get('next'))
  const [step, setStep] = useState(0)
  const [location, setLocation] = useState<LatLng | null>(null)
  const [radius, setRadius] = useState(5)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function saveZone() {
    if (!location) return setStep(1)
    setBusy(true)
    setError(null)
    try {
      await api('/me', { method: 'PATCH', body: JSON.stringify({ alertLocation: location, alertRadiusKm: radius }) })
      setStep(1)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  /** Termina la guía (no vuelve a salir) y sigue a `to`. */
  async function finish(to: string) {
    setBusy(true)
    try {
      await api('/me/onboarding', { method: 'PUT' })
      if (session) markAccountReady(session.user.id)
      navigate(to, { replace: true })
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 pt-8 pb-10">
      <div className="mb-6 flex items-center gap-3">
        <LogoMark size={36} />
        <ol className="flex flex-1 gap-1.5" aria-label="Pasos">
          {STEPS.map((label, i) => (
            <li key={label} aria-current={i === step ? 'step' : undefined} className="flex-1">
              <span className={cx('block h-1.5 rounded-full', i <= step ? 'bg-lost' : 'bg-track')} />
              <span className="sr-only">{label}</span>
            </li>
          ))}
        </ol>
        <button type="button" onClick={() => finish(next)} disabled={busy} className="text-sm font-extrabold text-muted hover:text-ink">
          Saltar
        </button>
      </div>

      {step === 0 && (
        <section className="space-y-4">
          <h1 className="font-display text-[26px] leading-tight font-extrabold tracking-[-0.8px]">¿Dónde vives?</h1>
          <p className="text-[15px] font-semibold text-body">
            Toca tu barrio en el mapa y te avisaremos cuando se pierda o aparezca una mascota cerca. Es privado: nadie más lo ve.
          </p>
          <LocationPicker value={location} onChange={setLocation} className="h-72" />
          <div>
            <p className="mb-2 text-sm font-extrabold">Avisarme a menos de</p>
            <div className="flex flex-wrap gap-2">
              {RADII.map((km) => (
                <Chip key={km} active={radius === km} onClick={() => setRadius(km)}>
                  {km} km
                </Chip>
              ))}
            </div>
          </div>
          {error && <ErrorText>{error}</ErrorText>}
          <Button className="w-full" disabled={busy} onClick={saveZone}>
            {location ? 'Guardar y seguir' : 'Ahora no'}
          </Button>
        </section>
      )}

      {step === 1 && (
        <section className="space-y-4">
          <h1 className="font-display text-[26px] leading-tight font-extrabold tracking-[-0.8px]">Que no se te escape ningún aviso</h1>
          <p className="text-[15px] font-semibold text-body">
            Activa las notificaciones y te llegará un aviso al móvil aunque no tengas Furrly abierta: mascotas perdidas en tu zona,
            si alguien ve a la tuya o si te escriben.
          </p>
          <PushToggle />
          <Button className="w-full" onClick={() => setStep(2)}>
            Seguir
          </Button>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4">
          <h1 className="font-display text-[26px] leading-tight font-extrabold tracking-[-0.8px]">¿Tienes mascota?</h1>
          <p className="text-[15px] font-semibold text-body">
            Crea su carnet con una foto. Si algún día se pierde, publicar el aviso te llevará un minuto. También podrás compartir
            sus fotos en la comunidad.
          </p>
          {error && <ErrorText>{error}</ErrorText>}
          <Button className="w-full" disabled={busy} onClick={() => finish('/mascotas/nueva')}>
            Añadir mi mascota
          </Button>
          <Button variant="secondary" className="w-full" disabled={busy} onClick={() => finish(next)}>
            Ahora no, ir a Furrly
          </Button>
        </section>
      )}
    </main>
  )
}
