import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { api } from './api'
import type { LikeState, Post } from './posts'

/**
 * Like optimista: el corazón cambia al instante y luego se corrige con lo que diga la API
 * (que es quien sabe el total real). Si la petición falla, se deshace.
 */
export function useLike(post: Pick<Post, 'id' | 'likesCount' | 'likedByMe'>) {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [state, setState] = useState<LikeState>({ likesCount: post.likesCount, likedByMe: post.likedByMe })
  const [pending, setPending] = useState(false)

  async function toggle() {
    if (!session) return navigate('/login', { state: { from: `/publicaciones/${post.id}` } })
    if (pending) return
    const previous = state
    const liked = !state.likedByMe
    setState({ likedByMe: liked, likesCount: state.likesCount + (liked ? 1 : -1) })
    setPending(true)
    try {
      setState(await api<LikeState>(`/posts/${post.id}/like`, { method: liked ? 'PUT' : 'DELETE' }))
    } catch {
      setState(previous)
    } finally {
      setPending(false)
    }
  }

  return { ...state, toggle }
}
