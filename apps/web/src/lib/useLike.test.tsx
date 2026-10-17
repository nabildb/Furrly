import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { renderRoutes } from '../test/render'
import { api } from './api'
import { useLike } from './useLike'

vi.mock('./api', () => ({ api: vi.fn() }))

function Probe() {
  const like = useLike({ id: 'p1', likesCount: 3, likedByMe: false })
  return (
    <button onClick={like.toggle}>
      {like.likedByMe ? 'me gusta' : 'no'} · {like.likesCount}
    </button>
  )
}

const routes = (
  <>
    <Route path="/" element={<Probe />} />
    <Route path="/login" element={<p>Pantalla de login</p>} />
  </>
)

/** Promesa que el test resuelve o rechaza cuando quiere, para ver el estado intermedio. */
function deferred<T>() {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => ((resolve = res), (reject = rej)))
  return { promise, resolve, reject }
}

describe('like optimista', () => {
  it('cambia al instante y luego se queda con lo que dice la API', async () => {
    const response = deferred<{ likesCount: number; likedByMe: boolean }>()
    vi.mocked(api).mockReturnValue(response.promise)
    renderRoutes(routes)

    await userEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('button')).toHaveTextContent('me gusta · 4')
    expect(api).toHaveBeenCalledWith('/posts/p1/like', { method: 'PUT' })

    response.resolve({ likesCount: 10, likedByMe: true })
    await waitFor(() => expect(screen.getByRole('button')).toHaveTextContent('me gusta · 10'))
  })

  it('si la API falla, se deshace', async () => {
    const response = deferred<never>()
    vi.mocked(api).mockReturnValue(response.promise)
    renderRoutes(routes)

    await userEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('button')).toHaveTextContent('me gusta · 4')
    response.reject(new Error('Sin conexión'))
    await waitFor(() => expect(screen.getByRole('button')).toHaveTextContent('no · 3'))
  })

  it('sin sesión lleva al login', async () => {
    renderRoutes(routes, { session: null })
    await userEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Pantalla de login')).toBeInTheDocument()
    expect(api).not.toHaveBeenCalled()
  })
})
