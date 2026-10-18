import { defineConfig } from 'vitest/config'

// BD del servicio PostGIS del workflow de CI (.github/workflows/ci.yml).
const TEST_DB = 'postgresql://postgres:postgres@localhost:54329/furrly_test'

export default defineConfig({
  test: {
    env: {
      DATABASE_URL: TEST_DB,
      DIRECT_URL: TEST_DB,
      SUPABASE_URL: 'http://supabase.test',
      RATE_LIMIT_ENABLED: 'false',
      CRON_SECRET: 'secreto-de-prueba',
      SUPABASE_SERVICE_ROLE_KEY: 'clave-de-servicio-de-prueba',
      // Par de claves VAPID solo para los tests (no se usa en ningún otro sitio).
      VAPID_PUBLIC_KEY: 'BKqxUOFpQPS12ofzSlce7QZ4YWS94NpFN0WmmH2fLhd6R2amuNscxHONHbZceBebYs1XNBM-LjOsHUSNRSssvuw',
      VAPID_PRIVATE_KEY: 'byfMvTLTOy18SA5_BHwHM-0TLOjQ9IdQHY62vxnRdB4',
    },
    globalSetup: ['test/global-setup.ts'],
    setupFiles: ['test/setup.ts'],
    // Todos los tests comparten la misma base de datos: uno detrás de otro.
    fileParallelism: false,
  },
})
