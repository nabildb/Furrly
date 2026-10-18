import { Link } from 'react-router'
import { cx } from '../lib/cx'
import type { LikeState, Post } from '../lib/posts'
import { useLike } from '../lib/useLike'
import { formatTimeAgo } from '../lib/reports'
import { CommentIcon, HeartIcon, PawIcon } from './ui/icons'

/** Foto redonda de la mascota (o huella si no tiene). */
export function PetAvatar({ url, size = 40 }: { url: string | null; size?: number }) {
  return (
    <span
      className="flex flex-none items-center justify-center overflow-hidden rounded-full bg-[#F6D9C8] text-lost/50"
      style={{ width: size, height: size }}
    >
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <PawIcon size={size * 0.5} />}
    </span>
  )
}

export function LikeButton({ likedByMe, likesCount, onToggle }: LikeState & { onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={likedByMe}
      // El número visible forma parte del nombre (quien usa control por voz dice lo que ve); aria-pressed dice si es tuyo.
      aria-label={`${likesCount} me gusta`}
      className={cx(
        'flex h-11 items-center gap-1.5 rounded-full px-2 text-[15px] font-extrabold transition active:scale-95',
        likedByMe ? 'text-lost' : 'text-ink hover:text-lost',
      )}
    >
      <HeartIcon filled={likedByMe} size={24} />
      <span className="text-ink">{likesCount}</span>
    </button>
  )
}

/** Cabecera de una publicación: mascota, dueño y cuándo. */
export function PostHeader({ post }: { post: Post }) {
  return (
    <div className="flex items-center gap-3">
      <Link to={`/mascotas/${post.pet.id}`} className="flex min-w-0 items-center gap-3">
        <PetAvatar url={post.pet.photoUrl} />
        <span className="min-w-0">
          <span className="block truncate font-display text-[15px] font-extrabold">{post.pet.name}</span>
          <span className="block truncate text-[13px] font-semibold text-muted">
            de @{post.pet.owner.username} · {formatTimeAgo(post.createdAt)}
          </span>
        </span>
      </Link>
    </div>
  )
}

/** Publicación en el feed: cabecera, foto cuadrada, me gusta, comentarios y texto. */
export function PostCard({ post }: { post: Post }) {
  const like = useLike(post)
  return (
    <article className="overflow-hidden rounded-card border border-card-line bg-surface">
      <div className="p-3">
        <PostHeader post={post} />
      </div>
      {/* Doble clic en la foto = me gusta, como en las redes sociales (y el botón para quien no lo sepa). */}
      <Link to={`/publicaciones/${post.id}`} onDoubleClick={(e) => (e.preventDefault(), !like.likedByMe && like.toggle())}>
        <img src={post.imageUrl} alt={`Foto de ${post.pet.name}`} loading="lazy" className="aspect-square w-full bg-subtle object-cover" />
      </Link>
      <div className="space-y-1 px-3 pt-1 pb-3">
        <div className="-ml-2 flex items-center">
          <LikeButton likedByMe={like.likedByMe} likesCount={like.likesCount} onToggle={like.toggle} />
          <Link
            to={`/publicaciones/${post.id}`}
            aria-label={`${post.commentsCount} ${post.commentsCount === 1 ? 'comentario' : 'comentarios'}`}
            className="flex h-11 items-center gap-1.5 rounded-full px-2 text-[15px] font-extrabold hover:text-lost"
          >
            <CommentIcon size={23} />
            {post.commentsCount}
          </Link>
        </div>
        {post.caption && (
          <p className="text-[15px] leading-snug text-body">
            <Link to={`/mascotas/${post.pet.id}`} className="font-extrabold text-ink">
              {post.pet.name}
            </Link>{' '}
            {post.caption}
          </p>
        )}
      </div>
    </article>
  )
}
