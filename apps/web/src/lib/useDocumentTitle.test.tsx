import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useDocumentTitle } from './useDocumentTitle'

describe('useDocumentTitle', () => {
  it('pone el título y lo restaura al salir de la página', () => {
    const { rerender, unmount } = renderHook(({ title }) => useDocumentTitle(title), {
      initialProps: { title: undefined as string | undefined },
    })
    expect(document.title).not.toContain('·')

    rerender({ title: 'Toby perdido' })
    expect(document.title).toBe('Toby perdido · Furrly')

    unmount()
    expect(document.title).toBe('Furrly')
  })
})
