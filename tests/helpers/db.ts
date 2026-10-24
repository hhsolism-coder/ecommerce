import { prisma } from '@/lib/db'

/**
 * Limpia las tablas de negocio para dejar la base de test en un estado conocido.
 * El orden respeta las claves foráneas.
 */
export async function resetDatabase(): Promise<void> {
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.cartItem.deleteMany()
  await prisma.cart.deleteMany()
  await prisma.session.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.user.deleteMany()
}

let sequence = 0

export async function createUser(overrides: Partial<{
  email: string
  name: string
  passwordHash: string
  role: 'ADMIN' | 'USER'
}> = {}) {
  sequence += 1
  return prisma.user.create({
    data: {
      email: overrides.email ?? `user-${sequence}-${process.pid}@test.local`,
      name: overrides.name ?? 'Usuario de prueba',
      passwordHash: overrides.passwordHash ?? 'hash-de-prueba',
      role: overrides.role ?? 'USER',
    },
  })
}

export async function createProduct(overrides: Partial<{
  name: string
  slug: string
  priceCents: number
  stock: number
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
}> = {}) {
  return prisma.product.create({
    data: {
      name: overrides.name ?? 'Producto de prueba',
      slug: overrides.slug ?? `producto-${Math.random().toString(36).slice(2, 10)}`,
      description: 'Producto creado para las pruebas de integración',
      priceCents: overrides.priceCents ?? 1000,
      currency: 'usd',
      stock: overrides.stock ?? 10,
      status: overrides.status ?? 'ACTIVE',
    },
  })
}
