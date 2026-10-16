import { Link } from 'react-router'
import { usePostsPages } from '../lib/usePostsPages'
import { Button } from './ui/Button'
import { SectionTitle } from './ui/Card'

/** Cuadrícula de fotos de una mascota (3 columnas, como un perfil de red social). */
export function PetPostsGrid({ petId, petName }: { petId: string; petName: string }) {
  const { posts, hasMore, loadMore, loadingMore, error } = usePostsPages(`/pets/${petId}/posts`)
  if (error) return null

  return (
    <section className="space-y-3">
      <SectionTitle>Publicaciones</SectionTitle>
      {posts?.length === 0 && <p className="text-[15px] font-semibold text-muted">{petName} aún no tiene fotos.</p>}
      <div className="grid grid-cols-3 gap-1.5 overflow-hidden rounded-2xl">
        {posts?.map((post) => (
          <Link key={post.id} to={`/publicaciones/${post.id}`} className="group relative block">
            <img
              src={post.imageUrl}
              alt={post.caption ?? `Foto de ${petName}`}
              loading="lazy"
              className="aspect-square w-full bg-subtle object-cover transition group-hover:opacity-85"
            />
          </Link>
        ))}
      </div>
      {hasMore && (
        <Button variant="secondary" size="md" onClick={loadMore} disabled={loadingMore} className="w-full">
          {loadingMore ? 'Cargando…' : 'Ver más fotos'}
        </Button>
      )}
    </section>
  )
}
