import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { DeleteAccount } from '../components/DeleteAccount'
import { ErrorText, Field, SelectField, TextAreaField } from '../components/Field'
import { LocationPicker } from '../components/LocationPicker'
import { Loading, Page } from '../components/Page'
import { PhotosInput } from '../components/PhotosInput'
import { PushToggle } from '../components/PushToggle'
import { Button } from '../components/ui/Button'
import { Card, SectionTitle } from '../components/ui/Card'
import { CountBadge } from '../components/ui/CountBadge'
import { ArrowRightIcon, BellIcon, CheckIcon, ListIcon, LogoutIcon, MessageIcon, UserIcon } from '../components/ui/icons'
import { useInbox } from '../inbox/useInbox'
import { api } from '../lib/api'
import type { LatLng } from '../lib/reports'
import { removeImage } from '../lib/storage'
import { signOut } from '../lib/session'
import type { Me } from '../lib/users'

const radiusOptions = { '1': '1 km', '2': '2 km', '5': '5 km', '10': '10 km', '25': '25 km', '50': '50 km' }

function MenuLink({ to, icon, count = 0, children }: { to: string; icon: ReactNode; count?: number; children: ReactNode }) {
  return (
    <Link to={to} className="flex h-14 items-center gap-3 px-4 text-[15px] font-extrabold transition hover:bg-subtle">
      {icon}
      <span className="flex-1">{children}</span>
      <CountBadge count={count} />
      <ArrowRightIcon size={18} className="text-muted" />
    </Link>
  )
}

export function Profile() {
  const inbox = useInbox()
  const [me, setMe] = useState<Me | null>(null)
  const [avatar, setAvatar] = useState<string[]>([])
  const [alertLocation, setAlertLocation] = useState<LatLng | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api<Me>('/me')
      .then((data) => {
        setMe(data)
        setAvatar(data.avatarUrl ? [data.avatarUrl] : [])
        setAlertLocation(data.alertLocation)
      })
      .catch((e: Error) => setError(e.message))
  }, [])

  if (error && !me) {
    return (
      <Page title="Mi perfil">
        <ErrorText>{error}</ErrorText>
      </Page>
    )
  }
  if (!me) return <Loading />

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!me) return
    const form = new FormData(e.currentTarget)
    setSubmitting(true)
    setError(null)
    setSaved(false)
    try {
      const updated = await api<Me>('/me', {
        method: 'PATCH',
        body: JSON.stringify({
          displayName: form.get('displayName'),
          bio: form.get('bio'),
          avatarUrl: avatar[0] ?? null,
          alertLocation,
          alertRadiusKm: Number(form.get('alertRadiusKm')),
        }),
      })
      if (me.avatarUrl && me.avatarUrl !== updated.avatarUrl) await removeImage(me.avatarUrl)
      setMe(updated)
      setSaved(true)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Page title="Mi perfil" width="wide">
      <p className="-mt-4 mb-5 text-[15px] font-semibold text-muted">@{me.username}</p>

      {/* Escritorio: menú y datos a la izquierda; zona de alertas y botones a la derecha. */}
      <form onSubmit={handleSubmit} className="space-y-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 lg:space-y-0">
        <div className="space-y-6">
          <Card className="divide-y divide-card-line overflow-hidden p-0">
            <MenuLink to="/mensajes" icon={<MessageIcon />} count={inbox.messages}>
              Mensajes
            </MenuLink>
            <MenuLink to="/notificaciones" icon={<BellIcon />} count={inbox.notifications}>
              Notificaciones
            </MenuLink>
            <MenuLink to="/avisos/mios" icon={<ListIcon />}>
              Mis avisos
            </MenuLink>
            <MenuLink to={`/u/${me.username}`} icon={<UserIcon />}>
              Ver mi perfil público
            </MenuLink>
          </Card>

          <Card className="space-y-4">
            <SectionTitle>Tus datos</SectionTitle>
            <PhotosInput
              label="Foto de perfil"
              value={avatar}
              onChange={setAvatar}
              max={1}
              folder="avatars"
              keep={me.avatarUrl ? [me.avatarUrl] : []}
            />
            <Field label="Nombre visible" name="displayName" required maxLength={60} defaultValue={me.displayName} />
            <TextAreaField label="Sobre ti" name="bio" maxLength={300} rows={3} defaultValue={me.bio ?? ''} />
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="space-y-3">
            <div>
              <SectionTitle>Zona de alertas</SectionTitle>
              <p className="mt-1 text-sm font-semibold text-muted">
                Marca tu barrio para enterarte de las mascotas perdidas cerca. Es privada: nunca se muestra en tu perfil.
              </p>
            </div>
            {!alertLocation && (
              <p className="rounded-[14px] bg-lost-soft px-3.5 py-2.5 text-sm font-bold text-lost-text">
                Aún no la has configurado.
              </p>
            )}
            <LocationPicker value={alertLocation} onChange={setAlertLocation} className="h-60 lg:h-80" />
            <div className="flex items-end gap-3">
              <div className="w-32">
                <SelectField label="Radio" name="alertRadiusKm" options={radiusOptions} defaultValue={String(me.alertRadiusKm)} />
              </div>
              {alertLocation && (
                <Button variant="secondary" size="md" onClick={() => setAlertLocation(null)} className="mb-px h-[50px]">
                  Quitar zona
                </Button>
              )}
            </div>
          </Card>

          <PushToggle />

          {error && <ErrorText>{error}</ErrorText>}
          {saved && (
            <p role="status" className="flex items-center gap-2 rounded-[14px] bg-resolved-soft px-3.5 py-2.5 text-sm font-bold text-resolved-text">
              <CheckIcon size={18} /> Cambios guardados.
            </p>
          )}
          <div className="space-y-4">
            <Button type="submit" variant="dark" disabled={submitting} className="w-full">
              {submitting ? 'Guardando…' : 'Guardar cambios'}
            </Button>
            <Button variant="secondary" size="md" onClick={signOut} className="w-full">
              <LogoutIcon size={20} /> Cerrar sesión
            </Button>
          </div>
          <DeleteAccount username={me.username} />
        </div>
      </form>
    </Page>
  )
}
