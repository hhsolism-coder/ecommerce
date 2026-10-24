import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { config as loadEnv } from 'dotenv'

// La base de datos de tests se carga ANTES de que arranquen los workers:
// los procesos hijos heredan process.env del proceso principal.
loadEnv({ path: '.env.test', override: true })

export default defineConfig({
  plugins: [react()],
  // Vite resuelve los alias de tsconfig de forma nativa.
  resolve: { tsconfigPaths: true },
  test: {
    globalSetup: ['./tests/global-setup.ts'],
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          environment: 'node',
          include: ['tests/integration/**/*.test.ts'],
          // Mockea `cookies()` y `redirect()` para poder ejecutar Server Actions
          // reales fuera de un ciclo de request de Next.
          setupFiles: ['./tests/setup-next.ts'],
          // Los archivos de integración comparten la misma base de datos: corren
          // de a uno para que el reset de uno no borre los datos del otro.
          fileParallelism: false,
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: ['tests/dom/**/*.test.tsx'],
          setupFiles: ['./tests/setup-dom.ts'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**', 'src/actions/**'],
      thresholds: { lines: 80 },
    },
  },
})
