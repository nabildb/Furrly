import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Field, SelectField, TextAreaField } from '../components/Field'
import { LocationPicker } from '../components/LocationPicker'
import { PhotosInput } from '../components/PhotosInput'
import { api } from '../lib/api'
import type { LatLng } from '../lib/reports'
import { removeImage } from '../lib/storage'
import type { Me } from '../lib/users'

const radiusOptions = { '1': '1 km', '2': '2 km', '5': '5 km', '10': '10 km', '25': '25 km', '50': '50 km' }

export function Profile() {
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

  if (error && !me) return <p className="text-red-600">{error}</p>
  if (!me) return <p>Cargando…</p>

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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Mi perfil</h1>
        <Link to={`/u/${me.username}`} className="text-sm underline">
          Ver mi perfil público
        </Link>
      </div>

      <PhotosInput value={avatar} onChange={setAvatar} max={1} folder="avatars" keep={me.avatarUrl ? [me.avatarUrl] : []} />
      <Field label="Nombre visible" name="displayName" required maxLength={60} defaultValue={me.displayName} />
      <TextAreaField label="Sobre ti" name="bio" maxLength={300} rows={3} defaultValue={me.bio ?? ''} />

      <fieldset className="space-y-2 rounded border border-gray-200 p-4">
        <legend className="px-1 text-sm font-medium">Zona de alertas</legend>
        <p className="text-xs text-gray-500">
          Marca tu barrio para enterarte de las mascotas perdidas cerca. Es privada: nunca se muestra en tu perfil.
        </p>
        <LocationPicker value={alertLocation} onChange={setAlertLocation} />
        <div className="flex items-end gap-4">
          <div className="w-32">
            <SelectField label="Radio" name="alertRadiusKm" options={radiusOptions} defaultValue={String(me.alertRadiusKm)} />
          </div>
          {alertLocation && (
            <button type="button" onClick={() => setAlertLocation(null)} className="pb-2 text-sm underline">
              Quitar zona
            </button>
          )}
        </div>
      </fieldset>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-green-700">Cambios guardados.</p>}
      <button disabled={submitting} className="rounded bg-black px-4 py-2 text-white disabled:opacity-50">
        {submitting ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </form>
  )
}
