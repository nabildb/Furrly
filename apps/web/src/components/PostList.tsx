import { useEffect, useRef } from 'react'
import { PostCard } from './PostCard'
import { Button } from './ui/Button'
import { PawIcon } from './ui/icons'

interface PostListProps {
  posts: Parameters<typeof PostCard>[0]['post'][]
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => void
}

/**
 * Lista de publicaciones con scroll infinito: cuando el final de la lista entra en pantalla
 * (IntersectionObserver) se pide la siguiente página. El botón queda por si el observer no salta.
 */
export function PostList({ posts, hasMore, loadingMore, onLoadMore }: PostListProps) {
  const sentinel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = sentinel.current
    if (!el || !hasMore) return
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && onLoadMore(), {
      rootMargin: '600px',
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, onLoadMore])

  return (
    <div className="space-y-5">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      <div ref={sentinel} />
      {hasMore ? (
        <Button variant="secondary" size="md" onClick={onLoadMore} disabled={loadingMore} className="w-full">
          {loadingMore ? 'Cargando…' : 'Ver más'}
        </Button>
      ) : (
        posts.length > 0 && (
          <p className="flex items-center justify-center gap-2 py-2 text-sm font-bold text-muted">
            <PawIcon size={16} /> Ya lo has visto todo
          </p>
        )
      )}
    </div>
  )
}
