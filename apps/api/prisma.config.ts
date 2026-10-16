import { defineConfig, env } from 'prisma/config'

// La CLI (migraciones) usa la conexión directa; la app usa DATABASE_URL (pooler)
// a través del driver adapter, ver src/lib/prisma.ts.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: env('DIRECT_URL') },
})
