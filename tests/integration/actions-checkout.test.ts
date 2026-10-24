import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/db'
import { startCheckoutAction } from '@/actions/checkout'
import { SESSION_COOKIE } from '@/lib/auth/cookie'
import { signSessionToken } from '@/lib/auth/jwt'
import { cookieStore, resetNextMocks } from '../helpers/next-mock-state'
import { createProduct, createUser, resetDatabase } from '../helpers/db'

const { stripeMock, stripeConfig } = vi.hoisted(() => ({
  stripeMock: {
    checkout: {
      sessions: {
        // Sin implementación tipada: los argumentos se inspeccionan en las aserciones.
        create: vi.fn(),
      },
    },
  },
  stripeConfig: { configured: true },
}))

vi.mock('@/lib/stripe', () => ({
  isStripeConfigured: vi.fn(() => stripeConfig.configured),
  getStripe: vi.fn(() => stripeMock),
  getWebhookSecret: vi.fn(() => 'whsec_test'),
  getAppUrl: vi.fn(() => 'http://localhost:3000'),
}))

beforeEach(async () => {
  await resetDatabase()
  resetNextMocks()
  stripeConfig.configured = true
  stripeMock.checkout.sessions.create.mockClear()
  stripeMock.checkout.sessions.create.mockResolvedValue({
    id: 'cs_test_123',
    url: 'https://checkout.stripe.com/c/pay/cs_test_123',
  })
})

async function signInAs(user: { id: string; role: 'ADMIN' | 'USER' }) {
  const session = await prisma.session.create({
    data: { userId: user.id, expiresAt: new Date(Date.now() + 60_000) },
  })
  const token = await signSessionToken({ sub: user.id, sid: session.id, role: user.role })
  cookieStore.set(SESSION_COOKIE, token)
}

describe('startCheckoutAction', () => {
  it('construye los line_items con los precios de la base de datos', async () => {
    const user = await createUser({ email: 'comprador@test.local' })
    await signInAs(user)

    const productoA = await createProduct({ name: 'Camiseta', priceCents: 18990, stock: 5 })
    const productoB = await createProduct({ name: 'Mochila', priceCents: 39990, stock: 2 })

    const cart = await prisma.cart.create({ data: { userId: user.id } })
    await prisma.cartItem.create({ data: { cartId: cart.id, productId: productoA.id, quantity: 2 } })
    await prisma.cartItem.create({ data: { cartId: cart.id, productId: productoB.id, quantity: 1 } })

    const result = await startCheckoutAction()

    expect(result).toEqual({ ok: true, url: 'https://checkout.stripe.com/c/pay/cs_test_123' })

    const args = stripeMock.checkout.sessions.create.mock.calls[0][0]
    expect(args.mode).toBe('payment')
    expect(args.line_items).toHaveLength(2)

    const camiseta = args.line_items.find(
      (item: { price_data: { product_data: { name: string } } }) =>
        item.price_data.product_data.name === 'Camiseta',
    )
    expect(camiseta.quantity).toBe(2)
    expect(camiseta.price_data.unit_amount).toBe(18990)

    const mochila = args.line_items.find(
      (item: { price_data: { product_data: { name: string } } }) =>
        item.price_data.product_data.name === 'Mochila',
    )
    expect(mochila.price_data.unit_amount).toBe(39990)
  })

  it('crea la orden en PENDING y guarda el id de la sesión de Stripe', async () => {
    const user = await createUser()
    await signInAs(user)
    const product = await createProduct({ priceCents: 5000, stock: 5 })

    const cart = await prisma.cart.create({ data: { userId: user.id } })
    await prisma.cartItem.create({ data: { cartId: cart.id, productId: product.id, quantity: 2 } })

    await startCheckoutAction()

    const order = await prisma.order.findFirstOrThrow()
    expect(order.status).toBe('PENDING')
    expect(order.paymentStatus).toBe('UNPAID')
    expect(order.subtotalCents).toBe(10000)
    expect(order.stripeSessionId).toBe('cs_test_123')
    expect(order.email).toBe(user.email)
  })

  it('falla con un mensaje claro cuando Stripe no está configurado', async () => {
    stripeConfig.configured = false

    const result = await startCheckoutAction()

    expect(result.ok).toBe(false)
    expect(result).toHaveProperty('error')
  })

  it('falla cuando el carrito está vacío', async () => {
    const user = await createUser()
    await signInAs(user)

    const result = await startCheckoutAction()

    expect(result.ok).toBe(false)
    expect(stripeMock.checkout.sessions.create).not.toHaveBeenCalled()
  })

  it('falla cuando Stripe no devuelve una URL', async () => {
    const user = await createUser()
    await signInAs(user)
    const product = await createProduct({ stock: 5 })
    const cart = await prisma.cart.create({ data: { userId: user.id } })
    await prisma.cartItem.create({ data: { cartId: cart.id, productId: product.id, quantity: 1 } })

    stripeMock.checkout.sessions.create.mockResolvedValueOnce({ id: 'cs_sin_url', url: null })

    const result = await startCheckoutAction()

    expect(result.ok).toBe(false)
  })

  it('devuelve un mensaje claro cuando la API de Stripe rechaza la clave', async () => {
    const user = await createUser()
    await signInAs(user)
    const product = await createProduct({ stock: 5 })
    const cart = await prisma.cart.create({ data: { userId: user.id } })
    await prisma.cartItem.create({ data: { cartId: cart.id, productId: product.id, quantity: 1 } })

    stripeMock.checkout.sessions.create.mockRejectedValueOnce(
      new Error('Invalid API Key provided: sk_test_****'),
    )

    const result = await startCheckoutAction()

    // No debe reventar con un 500: la acción devuelve un mensaje accionable.
    expect(result.ok).toBe(false)
    expect(result).toHaveProperty('error')
    expect(String((result as { error: string }).error)).toContain('STRIPE_SECRET_KEY')
  })

  it('cierra la orden cuando Stripe falla, para no dejar pedidos pendientes', async () => {
    const user = await createUser()
    await signInAs(user)
    const product = await createProduct({ stock: 5 })
    const cart = await prisma.cart.create({ data: { userId: user.id } })
    await prisma.cartItem.create({ data: { cartId: cart.id, productId: product.id, quantity: 1 } })

    stripeMock.checkout.sessions.create.mockRejectedValueOnce(new Error('Invalid API Key provided'))

    await startCheckoutAction()

    const orders = await prisma.order.findMany()
    expect(orders).toHaveLength(1)
    expect(orders[0].status).toBe('CANCELLED')
    expect(orders[0].paymentStatus).toBe('FAILED')
    expect(orders[0].stripeSessionId).toBeNull()
  })

  it('cierra la orden cuando Stripe no devuelve una URL de pago', async () => {
    const user = await createUser()
    await signInAs(user)
    const product = await createProduct({ stock: 5 })
    const cart = await prisma.cart.create({ data: { userId: user.id } })
    await prisma.cartItem.create({ data: { cartId: cart.id, productId: product.id, quantity: 1 } })

    stripeMock.checkout.sessions.create.mockResolvedValueOnce({ id: 'cs_sin_url', url: null })

    const result = await startCheckoutAction()

    expect(result.ok).toBe(false)
    const order = await prisma.order.findFirstOrThrow()
    expect(order.status).toBe('CANCELLED')
    expect(order.paymentStatus).toBe('FAILED')
  })
})
