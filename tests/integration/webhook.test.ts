import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/db'
import { getStripe } from '@/lib/stripe'
import { POST } from '@/app/api/webhooks/stripe/route'
import { createPendingOrder } from '@/lib/orders'
import { createProduct, createUser, resetDatabase } from '../helpers/db'

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? 'whsec_test_webhook_secret'

beforeEach(async () => {
  await resetDatabase()
})

function buildEvent(type: string, object: Record<string, unknown>) {
  return JSON.stringify({
    id: 'evt_test_1',
    object: 'event',
    api_version: '2024-06-20',
    created: Math.floor(Date.now() / 1000),
    type,
    data: { object },
  })
}

function signedRequest(payload: string, secret = WEBHOOK_SECRET): Request {
  const header = getStripe().webhooks.generateTestHeaderString({ payload, secret })
  return new Request('http://localhost:3000/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'stripe-signature': header, 'content-type': 'application/json' },
    body: payload,
  })
}

describe('POST /api/webhooks/stripe', () => {
  it('rechaza un evento con firma inválida', async () => {
    const response = await POST(signedRequest(buildEvent('checkout.session.completed', {}), 'whsec_secreto_incorrecto'))

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('Firma inválida')
  })

  it('rechaza la petición si falta el encabezado de firma', async () => {
    const response = await POST(
      new Request('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: buildEvent('checkout.session.completed', {}),
      }),
    )

    expect(response.status).toBe(400)
  })

  it('procesa checkout.session.completed y deja la orden pagada', async () => {
    const user = await createUser()
    const product = await createProduct({ priceCents: 3000, stock: 5 })

    const order = await createPendingOrder({
      userId: user.id,
      email: user.email,
      lines: [
        {
          productId: product.id,
          name: product.name,
          priceCents: product.priceCents,
          quantity: 2,
          stock: product.stock,
          currency: product.currency,
        },
      ],
    })
    await prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: 'cs_webhook_test' },
    })

    const payload = buildEvent('checkout.session.completed', {
      id: 'cs_webhook_test',
      object: 'checkout.session',
      payment_intent: 'pi_webhook_test',
      client_reference_id: 'cart_inexistente',
      metadata: { cartId: 'cart_inexistente', orderId: order.id },
      customer_details: { email: 'comprador@test.local' },
    })

    const response = await POST(signedRequest(payload))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ received: true })

    const updated = await prisma.order.findUniqueOrThrow({ where: { id: order.id } })
    expect(updated.status).toBe('PAID')
    expect(updated.paymentStatus).toBe('PAID')
    expect(updated.stripePaymentIntentId).toBe('pi_webhook_test')
    expect(updated.email).toBe('comprador@test.local')

    const updatedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
    expect(updatedProduct.stock).toBe(3)
  })

  it('es idempotente ante el reenvío del mismo evento', async () => {
    const user = await createUser()
    const product = await createProduct({ priceCents: 1000, stock: 5 })

    const order = await createPendingOrder({
      userId: user.id,
      email: user.email,
      lines: [
        {
          productId: product.id,
          name: product.name,
          priceCents: product.priceCents,
          quantity: 1,
          stock: product.stock,
          currency: product.currency,
        },
      ],
    })
    await prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: 'cs_webhook_replay' },
    })

    const payload = buildEvent('checkout.session.completed', {
      id: 'cs_webhook_replay',
      object: 'checkout.session',
      payment_intent: 'pi_webhook_replay',
      metadata: {},
    })

    await POST(signedRequest(payload))
    const response = await POST(signedRequest(payload))

    expect(response.status).toBe(200)

    const orders = await prisma.order.count({ where: { stripeSessionId: 'cs_webhook_replay' } })
    expect(orders).toBe(1)

    const updatedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
    expect(updatedProduct.stock).toBe(4)
  })

  it('acknowledgea eventos que no afectan a la orden', async () => {
    const payload = buildEvent('customer.created', { id: 'cus_test', object: 'customer' })
    const response = await POST(signedRequest(payload))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ received: true })
  })

  it('responde 503 cuando Stripe no está configurado de verdad', async () => {
    // La petición se firma antes de tocar el entorno: `getStripe()` lanza si
    // la clave es un placeholder.
    const request = signedRequest(buildEvent('checkout.session.completed', {}))
    const secretKey = process.env.STRIPE_SECRET_KEY
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder_xxxx'
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_placeholder_xxxx'

    try {
      const response = await POST(request)

      // 503 y no 400: no es un evento mal firmado, es una configuración incompleta.
      expect(response.status).toBe(503)
      const body = await response.json()
      expect(body.error).toContain('no está configurado')
    } finally {
      process.env.STRIPE_SECRET_KEY = secretKey
      process.env.STRIPE_WEBHOOK_SECRET = webhookSecret
    }
  })
})
