import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/useAuth'
import { sexLabels, speciesLabels, type Pet, type PetInput, type PetSex, type Species } from '../lib/pets'
import { removeImage, uploadImage } from '../lib/storage'
import { Field, SelectField, TextAreaField } from './Field'

interface PetFormProps {
  initial?: Pet
  submitLabel: string
  onSubmit: (data: PetInput) => Promise<void>
}

const text = (form: FormData, key: string) => String(form.get(key) ?? '').trim() || null

export function PetForm({ initial, submitLabel, onSubmit }: PetFormProps) {
  const { session } = useAuth()
  const [photoUrl, setPhotoUrl] = useState(initial?.photoUrl ?? null)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [today] = useState(() => new Date().toISOString().slice(0, 10))

  async function handlePhoto(file: File | undefined) {
    if (!file || !session) return
    setUploading(true)
    setError(null)
    try {
      const url = await uploadImage(file, session.user.id, 'pets')
      // Si la foto anterior se subió en esta misma edición, ya no la necesitamos.
      if (photoUrl && photoUrl !== initial?.photoUrl) await removeImage(photoUrl)
      setPhotoUrl(url)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        name: String(form.get('name')).trim(),
        species: form.get('species') as Species,
        sex: form.get('sex') as PetSex,
        breed: text(form, 'breed'),
        birthDate: text(form, 'birthDate'),
        color: text(form, 'color'),
        description: text(form, 'description'),
        microchip: text(form, 'microchip'),
        photoUrl,
      })
    } catch (e) {
      setError((e as Error).message)
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="h-24 w-24 overflow-hidden rounded-full bg-gray-100">
          {photoUrl && <img src={photoUrl} alt="" className="h-full w-full object-cover" />}
        </div>
        <label className="text-sm underline">
          {uploading ? 'Subiendo…' : photoUrl ? 'Cambiar foto' : 'Subir foto'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => handlePhoto(e.target.files?.[0])}
          />
        </label>
      </div>

      <Field label="Nombre" name="name" required maxLength={40} defaultValue={initial?.name} />
      <div className="grid grid-cols-2 gap-4">
        <SelectField label="Especie" name="species" options={speciesLabels} defaultValue={initial?.species ?? 'dog'} />
        <SelectField label="Sexo" name="sex" options={sexLabels} defaultValue={initial?.sex ?? 'unknown'} />
      </div>
      <Field label="Raza" name="breed" maxLength={60} defaultValue={initial?.breed ?? ''} />
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Fecha de nacimiento"
          name="birthDate"
          type="date"
          max={today}
          defaultValue={initial?.birthDate?.slice(0, 10) ?? ''}
        />
        <Field label="Color" name="color" maxLength={60} defaultValue={initial?.color ?? ''} />
      </div>
      <TextAreaField label="Descripción" name="description" maxLength={500} rows={3} defaultValue={initial?.description ?? ''} />
      <Field
        label="Microchip"
        name="microchip"
        maxLength={20}
        defaultValue={initial?.microchip ?? ''}
      />
      <p className="-mt-3 text-xs text-gray-500">Privado: solo lo ves tú.</p>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={submitting || uploading} className="rounded bg-black px-4 py-2 text-white disabled:opacity-50">
        {submitting ? 'Guardando…' : submitLabel}
      </button>
    </form>
  )
}
