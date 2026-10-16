import { defineConfig } from 'vitest/config'

// BD del servicio PostGIS del workflow de CI (.github/workflows/ci.yml).
const TEST_DB = 'postgresql://postgres:postgres@localhost:54329/furrly_test'

export default defineConfig({
  test: {
    env: {
      DATABASE_URL: TEST_DB,
      DIRECT_URL: TEST_DB,
      SUPABASE_URL: 'http://supabase.test',
    },
    globalSetup: ['test/global-setup.ts'],
    setupFiles: ['test/setup.ts'],
    // Todos los tests comparten la misma base de datos: uno detrás de otro.
    fileParallelism: false,
  },
})
