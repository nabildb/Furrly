import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import type { Post, PostsPage } from './posts'

interface Loaded {
  path: string
  posts: Post[]
  cursor: string | null
  error: string | null
}

/**
 * Carga un listado paginado por cursor (/feed, /posts, /pets/:id/posts) y va pidiendo
 * más páginas con loadMore(). Los datos guardan de qué ruta son: al cambiar de ruta,
 * mientras llega la nueva, posts vale null (cargando) sin tener que vaciar nada a mano.
 */
export function usePostsPages(path: string | null) {
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    if (!path) return
    let cancelled = false
    api<PostsPage>(path)
      .then((page) => !cancelled && setLoaded({ path, posts: page.posts, cursor: page.nextCursor, error: null }))
      .catch((e: Error) => !cancelled && setLoaded({ path, posts: [], cursor: null, error: e.message }))
    return () => {
      cancelled = true
    }
  }, [path])

  const current = loaded?.path === path ? loaded : null

  const loadMore = useCallback(async () => {
    if (!current?.cursor || loadingMore) return
    setLoadingMore(true)
    try {
      const sep = current.path.includes('?') ? '&' : '?'
      const page = await api<PostsPage>(`${current.path}${sep}cursor=${current.cursor}`)
      setLoaded({ ...current, posts: [...current.posts, ...page.posts], cursor: page.nextCursor })
    } catch (e) {
      setLoaded({ ...current, error: (e as Error).message })
    } finally {
      setLoadingMore(false)
    }
  }, [current, loadingMore])

  return {
    posts: current && !current.error ? current.posts : null,
    error: current?.error ?? null,
    hasMore: !!current?.cursor,
    loadMore,
    loadingMore,
  }
}
