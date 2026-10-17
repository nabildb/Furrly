import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// Supabase no se usa en los tests: la API se simula en cada test con vi.mock('../lib/api').
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signOut: vi.fn(),
    },
    storage: {
      from: () => ({
        upload: vi.fn(),
        remove: vi.fn(),
        list: vi.fn(async () => ({ data: [] })),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },
  },
}))

// APIs del navegador que jsdom no implementa.
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.matchMedia ??= (query: string) =>
  ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList
