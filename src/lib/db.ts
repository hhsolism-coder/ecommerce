import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL no está configurado. Copia .env.example a .env y define la conexión de PostgreSQL.',
    )
  }
  // Prisma 7 exige un driver adapter: `new PrismaClient()` sin adapter lanza error.
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

// En desarrollo Next.js recarga los módulos en caliente: reutilizar la instancia
// evita agotar el pool de conexiones de PostgreSQL.
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
