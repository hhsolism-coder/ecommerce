import { execSync } from 'node:child_process'
import { applyTestDatabaseEnv, redactDatabaseUrl } from './helpers/test-database'

/**
 * Prepara la base de datos de integración antes de correr la suite:
 * aplica las migraciones sobre `ecommerce_test`.
 *
 * La URL se resuelve en `tests/helpers/test-database.ts` a partir de
 * `TEST_DATABASE_URL` (entorno del sistema o `.env` local). Ese helper corre
 * también en `vitest.config.mts`, pero lo repetimos acá porque el global setup se
 * ejecuta después de que Vitest cargue los archivos `.env`: así los workers heredan
 * siempre la base de test y nunca la de desarrollo.
 *
 * `prisma.config.ts` usa `process.env.DATABASE_URL`, así que el CLI opera sobre la
 * base de test, nunca sobre la de desarrollo.
 */
export default function setup() {
  const { value: url, source } = applyTestDatabaseEnv()

  if (!url.includes('ecommerce_test')) {
    throw new Error(`Los tests de integración apuntan a una base que no es de test: ${url}`)
  }

  console.log(`[tests] base de integración: ${redactDatabaseUrl(url)} (origen: ${source})`)

  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: process.env,
  })
}
