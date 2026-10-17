import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Tests de componentes y lógica de la web (los end-to-end van con Playwright, en e2e/).
// Solo se ejecutan en la CI: las dependencias de test no se instalan en local.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
