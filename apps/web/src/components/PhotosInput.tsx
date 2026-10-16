import { useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { removeImage, uploadImage } from '../lib/storage'
import { CameraIcon, CloseIcon } from './ui/icons'

interface PhotosInputProps {
  value: string[]
  onChange: (urls: string[]) => void
  max: number
  folder: string
  label?: string
  /**
   * Fotos ya guardadas (al editar): al quitarlas no se borran de Storage todavía,
   * porque el usuario aún puede cancelar. Las borra la página tras guardar.
   */
  keep?: string[]
}

/** Sube varias fotos a Storage y devuelve sus URLs. */
export function PhotosInput({ value, onChange, max, folder, label = 'Fotos', keep = [] }: PhotosInputProps) {
  const { session } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFiles(files: FileList | null) {
    if (!files || !session) return
    const selected = [...files].slice(0, max - value.length)
    setUploading(true)
    setError(null)
    try {
      const urls = await Promise.all(selected.map((file) => uploadImage(file, session.user.id, folder)))
      onChange([...value, ...urls])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  function remove(url: string) {
    onChange(value.filter((u) => u !== url))
    if (!keep.includes(url)) void removeImage(url)
  }

  return (
    <div>
      <span className="text-sm font-extrabold">
        {label} <span className="font-semibold text-muted">({value.length}/{max})</span>
      </span>
      <div className="mt-1.5 flex flex-wrap gap-2.5">
        {value.map((url) => (
          <div key={url} className="relative h-24 w-24 overflow-hidden rounded-2xl bg-subtle">
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => remove(url)}
              className="absolute top-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-ink/70 text-white"
              aria-label="Quitar foto"
            >
              <CloseIcon size={14} />
            </button>
          </div>
        ))}
        {value.length < max && (
          <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-[#C9C5BB] text-xs font-extrabold text-muted transition hover:border-ink hover:text-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-lost">
            <CameraIcon size={22} />
            {uploading ? 'Subiendo…' : 'Añadir'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple={max > 1}
              className="sr-only"
              disabled={uploading}
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
        )}
      </div>
      {error && <p className="mt-1.5 text-sm font-bold text-lost-text">{error}</p>}
    </div>
  )
}
