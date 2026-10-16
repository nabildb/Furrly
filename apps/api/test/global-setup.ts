import { execSync } from 'node:child_process'

// BD del servicio PostGIS del workflow de CI (.github/workflows/ci.yml).
const TEST_DB = 'postgresql://postgres:postgres@localhost:54329/furrly_test'

// Supabase tiene el schema "extensions" (donde vive PostGIS) en el search_path de la
// base de datos; un Postgres normal no. Lo replicamos para que las consultas funcionen igual.
const SUPABASE_LIKE_SEARCH_PATH = 'ALTER DATABASE furrly_test SET search_path TO "$user", public, extensions;'

/** Deja la BD de tests recién migrada y configurada como Supabase antes de toda la ejecución. */
export default function setup() {
  const env = { ...process.env, DATABASE_URL: TEST_DB, DIRECT_URL: TEST_DB }
  try {
    execSync('npx prisma migrate reset --force', { env, stdio: 'pipe' })
    execSync('npx prisma db execute --stdin', { env, input: SUPABASE_LIKE_SEARCH_PATH, stdio: 'pipe' })
  } catch (e) {
    const output = String((e as { stderr?: Buffer }).stderr ?? e)
    throw new Error(`No se pudo preparar la BD de tests (se espera PostGIS en localhost:54329).\n${output}`)
  }
}
