import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from './api'
import { usePostsPages } from './usePostsPages'

vi.mock('./api', () => ({ api: vi.fn() }))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('listado paginado de publicaciones', () => {
  it('quita una publicación borrada y, si era el cursor, sigue desde la anterior', async () => {
    vi.mocked(api).mockResolvedValue({ posts: [{ id: 'p1' }, { id: 'p2' }], nextCursor: 'p2' })
    const { result } = renderHook(() => usePostsPages('/posts'))
    await waitFor(() => expect(result.current.posts).toHaveLength(2))

    act(() => result.current.remove('p2'))
    expect(result.current.posts?.map((post) => post.id)).toEqual(['p1'])

    vi.mocked(api).mockResolvedValue({ posts: [{ id: 'p3' }], nextCursor: null })
    await act(() => result.current.loadMore())
    expect(api).toHaveBeenLastCalledWith('/posts?cursor=p1')
    expect(result.current.posts?.map((post) => post.id)).toEqual(['p1', 'p3'])
  })
})
