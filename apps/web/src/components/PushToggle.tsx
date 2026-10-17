import { useEffect, useState } from 'react'
import { disablePush, enablePush, getPushStatus, type PushStatus } from '../lib/push'
import { Button } from './ui/Button'
import { Card, SectionTitle } from './ui/Card'
import { BellIcon, CheckIcon } from './ui/icons'

const messages: Record<Exclude<PushStatus, 'on' | 'off'>, string> = {
  unsupported: 'Este navegador no permite avisos push.',
  'ios-install':
    'En iPhone, primero añade Furrly a la pantalla de inicio (Compartir → Añadir a pantalla de inicio) y ábrela desde ahí.',
  denied: 'Has bloqueado las notificaciones de Furrly. Puedes volver a permitirlas en los ajustes del navegador.',
  unavailable: 'Los avisos push no están disponibles ahora mismo. Inténtalo más tarde.',
}

/** Activar o desactivar los avisos push en este dispositivo (cada móvil u ordenador se activa por separado). */
export function PushToggle({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<PushStatus | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getPushStatus().then(setStatus, () => setStatus('unsupported'))
  }, [])

  async function toggle() {
    setBusy(true)
    try {
      if (status === 'on') {
        await disablePush()
        setStatus('off')
      } else {
        setStatus(await enablePush())
      }
    } catch {
      setStatus('unavailable')
    } finally {
      setBusy(false)
    }
  }

  if (!status || (compact && status !== 'off')) return null

  return (
    <Card className="space-y-3">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[14px] bg-lost-soft text-lost">
          <BellIcon size={22} />
        </span>
        <div>
          <SectionTitle>Avisos en este dispositivo</SectionTitle>
          <p className="mt-0.5 text-sm font-semibold text-muted">
            {status === 'on'
              ? 'Activados: te avisaremos al momento de mascotas perdidas cerca, avistamientos y mensajes.'
              : status === 'off'
                ? 'Recibe al momento las mascotas perdidas en tu zona, aunque no tengas Furrly abierta.'
                : messages[status]}
          </p>
        </div>
      </div>
      {(status === 'on' || status === 'off') && (
        <Button variant={status === 'on' ? 'secondary' : 'primary'} size="md" onClick={toggle} disabled={busy} className="w-full">
          {status === 'on' ? (
            <>
              <CheckIcon size={20} /> Activados · desactivar
            </>
          ) : busy ? (
            'Activando…'
          ) : (
            'Activar avisos'
          )}
        </Button>
      )}
    </Card>
  )
}
