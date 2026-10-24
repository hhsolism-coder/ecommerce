import { defineConfig } from 'prisma/config'
import 'dotenv/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx ./prisma/seed.ts',
  },
  datasource: {
    // `env('DATABASE_URL')` lanza error cuando la variable falta (rompe `prisma generate`
    // en CI sin base de datos). El fallback vacío mantiene el CLI usable en todo contexto.
    url: process.env.DATABASE_URL ?? '',
  },
})
