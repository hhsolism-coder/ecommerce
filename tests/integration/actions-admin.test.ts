import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/db'
import { createProductAction, updateProductAction, archiveProductAction } from '@/actions/admin/products'
import { updateOrderStatusAction } from '@/actions/admin/orders'
import { updateUserRoleAction } from '@/actions/admin/users'
import { SESSION_COOKIE } from '@/lib/auth/cookie'
import { signSessionToken } from '@/lib/auth/jwt'
import { initialActionState } from '@/lib/action-state'
import { cookieStore, resetNextMocks } from '../helpers/next-mock-state'
import { createProduct, createUser, resetDatabase } from '../helpers/db'

beforeEach(async () => {
  await resetDatabase()
  resetNextMocks()
})

async function signInAs(user: { id: string; role: 'ADMIN' | 'USER' }) {
  const session = await prisma.session.create({
    data: { userId: user.id, expiresAt: new Date(Date.now() + 60_000) },
  })
  const token = await signSessionToken({ sub: user.id, sid: session.id, role: user.role })
  cookieStore.set(SESSION_COOKIE, token)
  return session
}

function productForm(overrides: Record<string, string> = {}): FormData {
  const data = new FormData()
  const fields = {
    name: 'Camiseta Test',
    description: 'Una descripción del producto de prueba',
    price: '199.90',
    stock: '10',
    status: 'ACTIVE',
    categoryId: '',
    imageUrl: '',
    ...overrides,
  }
  for (const [key, value] of Object.entries(fields)) data.set(key, value)
  return data
}

describe('createProductAction', () => {
  it('crea el producto cuando quien llama es ADMIN', async () => {
    const admin = await createUser({ role: 'ADMIN' })
    await signInAs(admin)

    const state = await createProductAction(initialActionState, productForm())

    expect(state.ok).toBe(true)
    const product = await prisma.product.findFirstOrThrow({ where: { name: 'Camiseta Test' } })
    expect(product.priceCents).toBe(19990)
    expect(product.slug).toBe('camiseta-test')
    expect(product.stock).toBe(10)
  })

  it('deniega la acción a un usuario USER', async () => {
    const user = await createUser({ role: 'USER' })
    await signInAs(user)

    await expect(createProductAction(initialActionState, productForm())).rejects.toThrow('REDIRECT:/')

    await expect(prisma.product.count()).resolves.toBe(0)
  })

  it('redirige al login si no hay sesión', async () => {
    await expect(createProductAction(initialActionState, productForm())).rejects.toThrow('REDIRECT:/login')
  })

  it('rechaza un precio inválido', async () => {
    const admin = await createUser({ role: 'ADMIN' })
    await signInAs(admin)

    const state = await createProductAction(initialActionState, productForm({ price: '0' }))

    expect(state.ok).toBe(false)
    expect(state.errors?.price).toBeTruthy()
  })

  it('rechaza un slug duplicado', async () => {
    const admin = await createUser({ role: 'ADMIN' })
    await signInAs(admin)
    await createProduct({ name: 'Camiseta Test', slug: 'camiseta-test' })

    const state = await createProductAction(initialActionState, productForm())

    expect(state.ok).toBe(false)
    expect(state.errors?.name).toBeTruthy()
  })
})

describe('updateProductAction', () => {
  it('actualiza el producto y su precio', async () => {
    const admin = await createUser({ role: 'ADMIN' })
    await signInAs(admin)
    const product = await createProduct({ name: 'Original', slug: 'original', priceCents: 1000 })

    const state = await updateProductAction(
      initialActionState,
      productForm({ id: product.id, name: 'Renombrado', price: '25.00' }),
    )

    expect(state.ok).toBe(true)
    const updated = await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
    expect(updated.name).toBe('Renombrado')
    expect(updated.priceCents).toBe(2500)
    expect(updated.slug).toBe('renombrado')
  })

  it('deniega la acción a un usuario USER', async () => {
    const user = await createUser({ role: 'USER' })
    await signInAs(user)
    const product = await createProduct()

    await expect(
      updateProductAction(initialActionState, productForm({ id: product.id })),
    ).rejects.toThrow('REDIRECT:/')

    const unchanged = await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
    expect(unchanged.name).toBe('Producto de prueba')
  })
})

describe('archiveProductAction', () => {
  it('archiva el producto', async () => {
    const admin = await createUser({ role: 'ADMIN' })
    await signInAs(admin)
    const product = await createProduct()

    const data = new FormData()
    data.set('id', product.id)

    const state = await archiveProductAction(data)

    expect(state.ok).toBe(true)
    const updated = await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
    expect(updated.status).toBe('ARCHIVED')
  })

  it('deniega la acción a un usuario USER', async () => {
    const user = await createUser({ role: 'USER' })
    await signInAs(user)
    const product = await createProduct()

    const data = new FormData()
    data.set('id', product.id)

    await expect(archiveProductAction(data)).rejects.toThrow('REDIRECT:/')
    const unchanged = await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
    expect(unchanged.status).toBe('ACTIVE')
  })
})

describe('updateOrderStatusAction', () => {
  it('cambia el estado del pedido y devuelve el stock al cancelar', async () => {
    const admin = await createUser({ role: 'ADMIN' })
    await signInAs(admin)
    const product = await createProduct({ stock: 5 })

    const order = await prisma.order.create({
      data: {
        orderNumber: 'ECOM-TEST-1',
        email: 'comprador@test.local',
        status: 'PAID',
        paymentStatus: 'PAID',
        subtotalCents: 1000,
        totalCents: 1000,
        items: { create: { productId: product.id, nameSnapshot: product.name, unitPriceCents: 1000, quantity: 2 } },
      },
    })

    const data = new FormData()
    data.set('orderId', order.id)
    data.set('status', 'CANCELLED')

    const state = await updateOrderStatusAction(initialActionState, data)

    expect(state.ok).toBe(true)
    const updated = await prisma.order.findUniqueOrThrow({ where: { id: order.id } })
    expect(updated.status).toBe('CANCELLED')

    const updatedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
    expect(updatedProduct.stock).toBe(7)
  })

  it('marcar pagado registra el pago y reserva el stock', async () => {
    const admin = await createUser({ role: 'ADMIN' })
    await signInAs(admin)
    const product = await createProduct({ stock: 5 })

    const order = await prisma.order.create({
      data: {
        orderNumber: 'ECOM-TEST-PAGADO',
        email: 'comprador@test.local',
        status: 'PENDING',
        paymentStatus: 'UNPAID',
        subtotalCents: 2000,
        totalCents: 2000,
        items: { create: { productId: product.id, nameSnapshot: product.name, unitPriceCents: 1000, quantity: 2 } },
      },
    })

    const data = new FormData()
    data.set('orderId', order.id)
    data.set('status', 'PAID')

    const state = await updateOrderStatusAction(initialActionState, data)

    expect(state.ok).toBe(true)
    const updated = await prisma.order.findUniqueOrThrow({ where: { id: order.id } })
    expect(updated.status).toBe('PAID')
    expect(updated.paymentStatus).toBe('PAID')

    const updatedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
    expect(updatedProduct.stock).toBe(3)
  })

  it('no inventa stock al cancelar un pedido que nunca se pagó', async () => {
    const admin = await createUser({ role: 'ADMIN' })
    await signInAs(admin)
    const product = await createProduct({ stock: 5 })

    const order = await prisma.order.create({
      data: {
        orderNumber: 'ECOM-TEST-PENDIENTE',
        email: 'comprador@test.local',
        status: 'PENDING',
        paymentStatus: 'UNPAID',
        subtotalCents: 2000,
        totalCents: 2000,
        items: { create: { productId: product.id, nameSnapshot: product.name, unitPriceCents: 1000, quantity: 2 } },
      },
    })

    const data = new FormData()
    data.set('orderId', order.id)
    data.set('status', 'CANCELLED')

    const state = await updateOrderStatusAction(initialActionState, data)

    expect(state.ok).toBe(true)
    const updated = await prisma.order.findUniqueOrThrow({ where: { id: order.id } })
    expect(updated.status).toBe('CANCELLED')

    // El stock nunca se descontó: al cancelar no debe devolverse nada.
    const updatedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
    expect(updatedProduct.stock).toBe(5)
  })

  it('no marca como pagado un pedido sin stock suficiente', async () => {
    const admin = await createUser({ role: 'ADMIN' })
    await signInAs(admin)
    const product = await createProduct({ stock: 1 })

    const order = await prisma.order.create({
      data: {
        orderNumber: 'ECOM-TEST-SIN-STOCK',
        email: 'comprador@test.local',
        status: 'PENDING',
        paymentStatus: 'UNPAID',
        subtotalCents: 3000,
        totalCents: 3000,
        items: { create: { productId: product.id, nameSnapshot: product.name, unitPriceCents: 1000, quantity: 3 } },
      },
    })

    const data = new FormData()
    data.set('orderId', order.id)
    data.set('status', 'PAID')

    const state = await updateOrderStatusAction(initialActionState, data)

    expect(state.ok).toBe(false)
    const updated = await prisma.order.findUniqueOrThrow({ where: { id: order.id } })
    expect(updated.status).toBe('CANCELLED')

    const updatedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
    expect(updatedProduct.stock).toBe(1)
  })

  it('rechaza una transición no permitida', async () => {
    const admin = await createUser({ role: 'ADMIN' })
    await signInAs(admin)

    const order = await prisma.order.create({
      data: {
        orderNumber: 'ECOM-TEST-2',
        email: 'comprador@test.local',
        status: 'CANCELLED',
        subtotalCents: 0,
        totalCents: 0,
      },
    })

    const data = new FormData()
    data.set('orderId', order.id)
    data.set('status', 'PAID')

    const state = await updateOrderStatusAction(initialActionState, data)

    expect(state.ok).toBe(false)
  })

  it('deniega la acción a un usuario USER', async () => {
    const user = await createUser({ role: 'USER' })
    await signInAs(user)

    const order = await prisma.order.create({
      data: { orderNumber: 'ECOM-TEST-3', email: 'c@test.local', subtotalCents: 0, totalCents: 0 },
    })

    const data = new FormData()
    data.set('orderId', order.id)
    data.set('status', 'PAID')

    await expect(updateOrderStatusAction(initialActionState, data)).rejects.toThrow('REDIRECT:/')
  })
})

describe('updateUserRoleAction', () => {
  it('cambia el rol y revoca las sesiones del usuario', async () => {
    const admin = await createUser({ role: 'ADMIN' })
    await signInAs(admin)
    const target = await createUser({ role: 'USER' })

    const targetSession = await prisma.session.create({
      data: { userId: target.id, expiresAt: new Date(Date.now() + 60_000) },
    })

    const data = new FormData()
    data.set('userId', target.id)
    data.set('role', 'ADMIN')

    const state = await updateUserRoleAction(initialActionState, data)

    expect(state.ok).toBe(true)
    const updated = await prisma.user.findUniqueOrThrow({ where: { id: target.id } })
    expect(updated.role).toBe('ADMIN')

    const revoked = await prisma.session.findUniqueOrThrow({ where: { id: targetSession.id } })
    expect(revoked.revokedAt).not.toBeNull()
  })

  it('no permite cambiar el propio rol', async () => {
    const admin = await createUser({ role: 'ADMIN' })
    await signInAs(admin)

    const data = new FormData()
    data.set('userId', admin.id)
    data.set('role', 'USER')

    const state = await updateUserRoleAction(initialActionState, data)

    expect(state.ok).toBe(false)
    const unchanged = await prisma.user.findUniqueOrThrow({ where: { id: admin.id } })
    expect(unchanged.role).toBe('ADMIN')
  })

  it('deniega la acción a un usuario USER', async () => {
    const user = await createUser({ role: 'USER' })
    await signInAs(user)
    const target = await createUser()

    const data = new FormData()
    data.set('userId', target.id)
    data.set('role', 'ADMIN')

    await expect(updateUserRoleAction(initialActionState, data)).rejects.toThrow('REDIRECT:/')

    const unchanged = await prisma.user.findUniqueOrThrow({ where: { id: target.id } })
    expect(unchanged.role).toBe('USER')
  })
})
