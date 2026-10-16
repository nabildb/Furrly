import { execSync } from 'node:child_process'

/** Deja la BD de tests recién migrada antes de toda la ejecución. */
export default function setup() {
  const url = 'postgresql://postgres:postgres@localhost:54329/furrly_test'
  try {
    execSync('npx prisma migrate reset --force', {
      env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
      stdio: 'pipe',
    })
  } catch (e) {
    const output = String((e as { stderr?: Buffer }).stderr ?? e)
    throw new Error(`No se pudo preparar la BD de tests. ¿Está arrancada? (npm run db:test:up)\n${output}`)
  }
}
