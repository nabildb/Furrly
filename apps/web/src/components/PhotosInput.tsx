import { useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { removeImage, uploadImage } from '../lib/storage'

interface PhotosInputProps {
  value: string[]
  onChange: (urls: string[]) => void
  max: number
  folder: string
  /**
   * Fotos ya guardadas (al editar): al quitarlas no se borran de Storage todavía,
   * porque el usuario aún puede cancelar. Las borra la página tras guardar.
   */
  keep?: string[]
}

/** Sube varias fotos a Storage y devuelve sus URLs. */
export function PhotosInput({ value, onChange, max, folder, keep = [] }: PhotosInputProps) {
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
      <span className="text-sm font-medium">
        Fotos ({value.length}/{max})
      </span>
      <div className="mt-1 flex flex-wrap gap-2">
        {value.map((url) => (
          <div key={url} className="relative h-20 w-20 overflow-hidden rounded bg-gray-100">
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => remove(url)}
              className="absolute top-0 right-0 bg-black/60 px-1.5 text-xs text-white"
              aria-label="Quitar foto"
            >
              ✕
            </button>
          </div>
        ))}
        {value.length < max && (
          <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded border border-dashed border-gray-400 text-xs text-gray-600">
            {uploading ? 'Subiendo…' : '+ Añadir'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              disabled={uploading}
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}
