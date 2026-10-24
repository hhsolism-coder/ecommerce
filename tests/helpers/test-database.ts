import fs from 'node:fs'
import path from 'node:path'
import { parse } from 'dotenv'

/**
 * Resolución de la base de datos que usa la suite de tests.
 *
 * Las credenciales nunca se versionan. El repositorio solo guarda plantillas y
 * cada máquina define la URL real en `TEST_DATABASE_URL`:
 *
 *   1. `.env` local (ignorado por git) — la fuente normal en desarrollo.
 *   2. Entorno del sistema — la fuente normal en CI, donde no hay `.env`.
 *
 * `.env.test` (versionado) NO define la URL de la base: si lo hiciera, su valor
 * pisaría al del entorno del sistema al cargarse. Solo trae el resto de valores
 * de test (secreto de autenticación y claves falsas de Stripe).
 */

const PLACEHOLDER = '<password>'

export interface TestDatabaseUrl {
  /** URL de conexión con la contraseña real. */
  value: string
  /** De dónde salió, para poder explicar el error si algo falla. */
  source: string
}

/** Oculta la contraseña antes de mostrar una URL en un mensaje de error. */
export function redactDatabaseUrl(url: string): string {
  return url.replace(/(:\/\/[^:@/]+):[^@/]*@/, '$1:***@')
}

function readEnvFile(file: string): Record<string, string> {
  const absolute = path.resolve(process.cwd(), file)
  if (!fs.existsSync(absolute)) return {}

  try {
    return parse(fs.readFileSync(absolute, 'utf8'))
  } catch {
    return {}
  }
}

/**
 * Devuelve la URL de la base de tests lanzando un error explicativo si no está
 * configurada, si todavía tiene el placeholder o si no apunta a `ecommerce_test`.
 */
export function resolveTestDatabaseUrl(): TestDatabaseUrl {
  const localEnv = readEnvFile('.env')

  const candidates: TestDatabaseUrl[] = [
    { value: localEnv.TEST_DATABASE_URL?.trim() ?? '', source: '.env (TEST_DATABASE_URL)' },
    { value: process.env.TEST_DATABASE_URL?.trim() ?? '', source: 'entorno del sistema' },
    { value: localEnv.DATABASE_URL_TEST?.trim() ?? '', source: '.env (DATABASE_URL_TEST)' },
    { value: process.env.DATABASE_URL_TEST?.trim() ?? '', source: 'entorno del sistema' },
  ]

  const found = candidates.find((candidate) => candidate.value.length > 0)

  if (!found) {
    throw new Error(
      'No se encontró la base de datos de los tests.\n' +
        'Definí TEST_DATABASE_URL en tu .env local (ignorado por git) o exportala en el entorno:\n' +
        '  TEST_DATABASE_URL="postgresql://usuario:clave@localhost:5432/ecommerce_test?schema=public"',
    )
  }

  // Un placeholder en una fuente no invalida una fuente posterior que sí tenga la
  // clave real: se elige la primera usable y, si ninguna lo es, se explica qué falta.
  const selected = candidates.find(
    (candidate) => candidate.value.length > 0 && !candidate.value.includes(PLACEHOLDER),
  )

  if (!selected) {
    throw new Error(
      `TEST_DATABASE_URL todavía tiene el placeholder "${PLACEHOLDER}" ` +
        `(origen: ${found.source}).\n` +
        'Copiá .env.example a .env, completá la clave local de PostgreSQL y volvé a correr los tests.',
    )
  }

  if (!selected.value.includes('ecommerce_test')) {
    throw new Error(
      'La base de datos de los tests debe llamarse "ecommerce_test" ' +
        `(origen: ${selected.source}). Revisión: ${redactDatabaseUrl(selected.value)}`,
    )
  }

  return selected
}

/**
 * Fija `DATABASE_URL` y `TEST_DATABASE_URL` con la base de tests.
 *
 * Se llama desde `vitest.config.mts` y desde `tests/global-setup.ts`: el segundo
 * caso corre después de que Vitest cargue los archivos `.env`, así que garantiza
 * que los workers hereden siempre la base de test y nunca la de desarrollo.
 */
export function applyTestDatabaseEnv(): TestDatabaseUrl {
  const resolved = resolveTestDatabaseUrl()

  process.env.TEST_DATABASE_URL = resolved.value
  process.env.DATABASE_URL = resolved.value

  return resolved
}
