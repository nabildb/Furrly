import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { ErrorText, TextAreaField } from '../components/Field'
import { Loading, Page } from '../components/Page'
import { Button } from '../components/ui/Button'
import { CameraIcon, CloseIcon, PawIcon } from '../components/ui/icons'
import { api } from '../lib/api'
import type { Pet } from '../lib/pets'
import type { Post } from '../lib/posts'
import { removeImage, uploadImage } from '../lib/storage'

/** Nueva publicación: elegir mascota, subir una foto y escribir un texto. */
export function PostNew() {
  const navigate = useNavigate()
  const { session } = useAuth()
  // /publicaciones/nueva?mascota=<id> llega desde el carnet.
  const [params] = useSearchParams()
  const [pets, setPets] = useState<Pet[] | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<Pet[]>('/me/pets')
      .then(setPets)
      .catch((e: Error) => setError(e.message))
  }, [])

  async function handlePhoto(file: File | undefined) {
    if (!file || !session) return
    setUploading(true)
    setError(null)
    try {
      const url = await uploadImage(file, session.user.id, 'posts')
      if (imageUrl) await removeImage(imageUrl)
      setImageUrl(url)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  async function removePhoto() {
    if (imageUrl) await removeImage(imageUrl)
    setImageUrl(null)
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!imageUrl) return setError('Elige una foto.')
    const form = new FormData(e.currentTarget)
    setSubmitting(true)
    setError(null)
    try {
      const post = await api<Post>('/posts', {
        method: 'POST',
        body: JSON.stringify({ petId: form.get('petId'), imageUrl, caption: form.get('caption') }),
      })
      navigate(`/publicaciones/${post.id}`, { replace: true })
    } catch (e) {
      setError((e as Error).message)
      setSubmitting(false)
    }
  }

  if (!pets && !error) return <Loading />

  if (pets?.length === 0) {
    return (
      <Page title="Nueva publicación" back="/comunidad">
        <p className="rounded-2xl bg-lost-soft p-4 text-[15px] font-semibold text-lost-text">
          Las publicaciones son de tus mascotas: primero{' '}
          <Link to="/mascotas/nueva" className="font-extrabold underline">
            añade una
          </Link>
          .
        </p>
      </Page>
    )
  }

  const preselected = params.get('mascota') ?? pets?.[0]?.id

  return (
    <Page title="Nueva publicación" back="/comunidad" width="feed" bottomSpace={false} className="pb-12">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Foto: cuadrada, como se verá en el feed */}
        {imageUrl ? (
          <div className="relative">
            <img src={imageUrl} alt="Vista previa" className="aspect-square w-full rounded-card object-cover" />
            <button
              type="button"
              onClick={removePhoto}
              aria-label="Quitar foto"
              className="absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-ink/70 text-white"
            >
              <CloseIcon size={18} />
            </button>
          </div>
        ) : (
          <label className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed border-[#C9C5BB] bg-surface text-muted transition hover:border-ink hover:text-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-lost">
            <CameraIcon size={40} />
            <span className="font-display text-base font-extrabold">{uploading ? 'Subiendo…' : 'Elige una foto'}</span>
            <span className="text-sm font-semibold">JPG, PNG o WebP, hasta 5 MB</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => handlePhoto(e.target.files?.[0])}
            />
          </label>
        )}

        <fieldset>
          <legend className="mb-2.5 text-sm font-extrabold">¿De quién es la foto?</legend>
          <div className="flex flex-wrap gap-2.5">
            {pets?.map((pet) => (
              <label
                key={pet.id}
                className="flex cursor-pointer items-center gap-2 rounded-full border-2 border-card-line bg-surface py-1 pr-4 pl-1 transition has-[:checked]:border-lost has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-lost"
              >
                <input type="radio" name="petId" value={pet.id} required defaultChecked={pet.id === preselected} className="sr-only" />
                <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#F6D9C8] text-lost/50">
                  {pet.photoUrl ? <img src={pet.photoUrl} alt="" className="h-full w-full object-cover" /> : <PawIcon size={18} />}
                </span>
                <span className="text-[15px] font-extrabold">{pet.name}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <TextAreaField label="Texto (opcional)" name="caption" maxLength={500} rows={3} placeholder="Primer paseo por Madrid Río…" />

        {error && <ErrorText>{error}</ErrorText>}
        <Button type="submit" disabled={submitting || uploading || !imageUrl} className="w-full">
          {submitting ? 'Publicando…' : 'Publicar'}
        </Button>
      </form>
    </Page>
  )
}
