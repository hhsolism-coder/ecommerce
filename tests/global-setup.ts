import { execSync } from 'node:child_process'

/**
 * Prepara la base de datos de integración antes de correr la suite:
 * aplica las migraciones sobre `ecommerce_test`.
 *
 * La URL viene de `.env.test`, que `vitest.config.mts` carga antes de que
 * arranquen los workers. `prisma.config.ts` usa `process.env.DATABASE_URL`,
 * así que el CLI opera sobre la base de test, nunca sobre la de desarrollo.
 */
export default function setup() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL no está configurado para los tests (revisá .env.test).')
  }
  if (!url.includes('ecommerce_test')) {
    throw new Error(`Los tests de integración apuntan a una base que no es de test: ${url}`)
  }

  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: process.env,
  })
}
