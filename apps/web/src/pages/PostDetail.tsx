import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { useMe } from '../auth/useMe'
import { Avatar } from '../components/Avatar'
import { ErrorText } from '../components/Field'
import { FlagButton } from '../components/FlagButton'
import { ModeratorDeleteButton } from '../components/ModeratorDeleteButton'
import { Loading, Page, PageError } from '../components/Page'
import { LikeButton, PostHeader } from '../components/PostCard'
import { Button } from '../components/ui/Button'
import { SectionTitle } from '../components/ui/Card'
import { TrashIcon } from '../components/ui/icons'
import { iconButtonClass } from '../components/ui/styles'
import { api } from '../lib/api'
import { removeContent } from '../lib/moderation'
import type { Post, PostComment } from '../lib/posts'
import { formatTimeAgo } from '../lib/reports'
import { removeImage } from '../lib/storage'
import { useLike } from '../lib/useLike'

function PostView({ post, onDeleted }: { post: Post; onDeleted: () => void }) {
  const { session } = useAuth()
  const { username, isAdmin } = useMe()
  const myUsername = username ?? undefined
  // Solo decide qué botones se ven: quien de verdad lo comprueba es la API.
  const isOwner = myUsername === post.pet.owner.username
  const like = useLike(post)
  const [comments, setComments] = useState<PostComment[] | null>(null)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<PostComment[]>(`/posts/${post.id}/comments`)
      .then(setComments)
      .catch((e: Error) => setError(e.message))
  }, [post.id])

  async function sendComment(e: FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setSending(true)
    setError(null)
    try {
      const comment = await api<PostComment>(`/posts/${post.id}/comments`, { method: 'POST', body: JSON.stringify({ body }) })
      setComments((prev) => [...(prev ?? []), comment])
      setBody('')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSending(false)
    }
  }

  async function deleteComment(comment: PostComment) {
    if (!confirm('¿Borrar este comentario?')) return
    try {
      if (isOwner || comment.user.username === myUsername) await api(`/posts/${post.id}/comments/${comment.id}`, { method: 'DELETE' })
      else await removeContent('comment', comment.id)
      setComments((prev) => prev?.filter((c) => c.id !== comment.id) ?? null)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function deletePost() {
    if (!confirm('¿Borrar esta publicación? También se borrarán sus comentarios.')) return
    try {
      await api(`/posts/${post.id}`, { method: 'DELETE' })
      await removeImage(post.imageUrl)
      onDeleted()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    // Móvil y tablet: una columna. Escritorio: foto a la izquierda, conversación a la derecha.
    <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-8 lg:space-y-0">
      <img src={post.imageUrl} alt={`Foto de ${post.pet.name}`} className="aspect-square w-full rounded-card bg-subtle object-cover" />

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <PostHeader post={post} />
          {isOwner ? (
            <button type="button" onClick={deletePost} aria-label="Borrar publicación" className={iconButtonClass('text-danger')}>
              <TrashIcon size={20} />
            </button>
          ) : isAdmin ? (
            <ModeratorDeleteButton
              type="post"
              id={post.id}
              label="Borrar publicación"
              question={`¿Borrar esta publicación de @${post.pet.owner.username}? También se borrarán sus comentarios. No se puede deshacer.`}
              icon
              onDeleted={onDeleted}
            />
          ) : (
            <FlagButton target={{ targetType: 'post', targetId: post.id }} />
          )}
        </div>
        {post.caption && <p className="text-[15px] leading-relaxed whitespace-pre-line text-body">{post.caption}</p>}
        <div className="-ml-2 border-b border-card-line pb-2">
          <LikeButton likedByMe={like.likedByMe} likesCount={like.likesCount} onToggle={like.toggle} />
        </div>

        <section className="space-y-3">
          <SectionTitle>Comentarios {comments && `(${comments.length})`}</SectionTitle>
          {comments?.length === 0 && <p className="text-[15px] font-semibold text-muted">Nadie ha comentado todavía.</p>}
          <ul className="space-y-3">
            {comments?.map((c) => (
              <li key={c.id} className="flex items-start gap-2.5">
                <Link to={`/u/${c.user.username}`}>
                  <Avatar url={c.user.avatarUrl} name={c.user.displayName} className="h-9 w-9 text-sm" />
                </Link>
                <div className="min-w-0 flex-1 text-[15px] leading-snug">
                  <p>
                    <Link to={`/u/${c.user.username}`} className="font-extrabold">
                      @{c.user.username}
                    </Link>{' '}
                    <span className="text-body">{c.body}</span>
                  </p>
                  <p className="text-xs font-semibold text-muted first-letter:uppercase">{formatTimeAgo(c.createdAt)}</p>
                </div>
                {c.user.username !== myUsername && !isAdmin && (
                  <FlagButton target={{ targetType: 'comment', targetId: c.id }} label="" className="px-1 py-1" />
                )}
                {(c.user.username === myUsername || isOwner || isAdmin) && (
                  <button
                    type="button"
                    onClick={() => deleteComment(c)}
                    className="rounded-lg px-2 py-1 text-xs font-extrabold text-danger hover:bg-lost-soft"
                  >
                    Borrar
                  </button>
                )}
              </li>
            ))}
          </ul>

          {error && <ErrorText>{error}</ErrorText>}
          {session ? (
            <form onSubmit={sendComment} className="flex gap-2">
              <label className="sr-only" htmlFor="comment">
                Escribe un comentario
              </label>
              <input
                id="comment"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={500}
                placeholder="Escribe un comentario…"
                className="h-11 min-w-0 flex-1 rounded-[14px] border border-line bg-surface px-3.5 text-[15px] font-semibold placeholder:font-normal placeholder:text-muted/70 focus:border-ink focus:outline-none"
              />
              <Button type="submit" variant="dark" size="md" disabled={sending || !body.trim()}>
                Enviar
              </Button>
            </form>
          ) : (
            <p className="text-[15px] font-semibold text-muted">
              <Link to="/login" state={{ from: `/publicaciones/${post.id}` }} className="font-extrabold text-lost-text">
                Entra
              </Link>{' '}
              para comentar.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}

export function PostDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [post, setPost] = useState<Post | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<Post>(`/posts/${id}`)
      .then(setPost)
      .catch((e: Error) => setError(e.message))
  }, [id])

  if (error) return <PageError message={error} back="/comunidad" />
  if (!post) return <Loading />

  return (
    <Page title="Publicación" back="/comunidad" width="wide">
      {/* key: si se navega a otra publicación, el estado (likes, comentarios) empieza de cero. */}
      <PostView key={post.id} post={post} onDeleted={() => navigate('/comunidad', { replace: true })} />
    </Page>
  )
}
