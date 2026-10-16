import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/useAuth'
import { sexLabels, speciesLabels, type Pet, type PetInput, type PetSex, type Species } from '../lib/pets'
import { removeImage, uploadImage } from '../lib/storage'
import { ErrorText, Field, SelectField, TextAreaField } from './Field'
import { Button } from './ui/Button'
import { CameraIcon, PawIcon } from './ui/icons'

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
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center gap-4">
        <div className="flex h-[124px] w-[104px] flex-none items-center justify-center overflow-hidden rounded-[22px] bg-[#F6D9C8] text-lost/40">
          {photoUrl ? <img src={photoUrl} alt="" className="h-full w-full object-cover" /> : <PawIcon size={40} />}
        </div>
        <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-[14px] border border-line bg-surface px-4 text-[15px] font-extrabold transition hover:bg-subtle has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-lost">
          <CameraIcon size={20} />
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
      <TextAreaField label="Cómo es" hint="Carácter, señas, si se deja coger…" name="description" maxLength={500} rows={3} defaultValue={initial?.description ?? ''} />
      <Field
        label="Microchip"
        name="microchip"
        maxLength={20}
        inputMode="numeric"
        defaultValue={initial?.microchip ?? ''}
        hint="Privado: solo lo ves tú."
      />

      {error && <ErrorText>{error}</ErrorText>}
      <Button type="submit" variant="dark" disabled={submitting || uploading} className="w-full">
        {submitting ? 'Guardando…' : submitLabel}
      </Button>
    </form>
  )
}
