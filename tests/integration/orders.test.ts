import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/db'
import { createPendingOrder, cancelUnpaidOrder, markOrderPaid, processCheckoutCompleted, processPaymentFailed } from '@/lib/orders'
import { createProduct, createUser, resetDatabase } from '../helpers/db'

beforeEach(async () => {
  await resetDatabase()
})

async function createOrderWithProduct(options: {
  priceCents?: number
  stock?: number
  quantity?: number
  stripeSessionId?: string
}) {
  const user = await createUser()
  const product = await createProduct({
    priceCents: options.priceCents ?? 1000,
    stock: options.stock ?? 10,
  })

  const order = await createPendingOrder({
    userId: user.id,
    email: user.email,
    lines: [
      {
        productId: product.id,
        name: product.name,
        priceCents: product.priceCents,
        quantity: options.quantity ?? 2,
        stock: product.stock,
        currency: product.currency,
      },
    ],
  })

  if (options.stripeSessionId) {
    await prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: options.stripeSessionId },
    })
  }

  return { order, product, user }
}

describe('createPendingOrder', () => {
  it('calcula los totales a partir de los precios de la base de datos', async () => {
    const { order } = await createOrderWithProduct({ priceCents: 2500, quantity: 3 })

    expect(order.subtotalCents).toBe(7500)
    expect(order.totalCents).toBe(7500)
    expect(order.status).toBe('PENDING')
    expect(order.paymentStatus).toBe('UNPAID')
  })

  it('guarda un snapshot del nombre y del precio unitario', async () => {
    const { order } = await createOrderWithProduct({ priceCents: 2500, quantity: 3 })

    expect(order.items).toHaveLength(1)
    expect(order.items[0].unitPriceCents).toBe(2500)
    expect(order.items[0].quantity).toBe(3)
    expect(order.items[0].nameSnapshot).toBeTruthy()
  })

  it('genera un número de pedido único', async () => {
    const first = await createOrderWithProduct({})
    const second = await createOrderWithProduct({})

    expect(first.order.orderNumber).not.toBe(second.order.orderNumber)
    expect(first.order.orderNumber).toMatch(/^ECOM-\d{8}-[0-9A-F]{6}$/)
  })
})

describe('processCheckoutCompleted', () => {
  it('marca la orden como pagada y descuenta el stock', async () => {
    const { order, product } = await createOrderWithProduct({
      priceCents: 1000,
      stock: 10,
      quantity: 2,
      stripeSessionId: 'cs_test_pagada',
    })

    const result = await processCheckoutCompleted({
      sessionId: 'cs_test_pagada',
      paymentIntentId: 'pi_test_123',
    })

    expect(result).toBe('paid')

    const updated = await prisma.order.findUniqueOrThrow({ where: { id: order.id } })
    expect(updated.status).toBe('PAID')
    expect(updated.paymentStatus).toBe('PAID')
    expect(updated.stripePaymentIntentId).toBe('pi_test_123')

    const updatedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
    expect(updatedProduct.stock).toBe(8)
  })

  it('es idempotente: reenviar el webhook no duplica ni descuenta otra vez', async () => {
    const { product } = await createOrderWithProduct({
      stock: 10,
      quantity: 2,
      stripeSessionId: 'cs_test_idempotente',
    })

    const first = await processCheckoutCompleted({ sessionId: 'cs_test_idempotente' })
    const second = await processCheckoutCompleted({ sessionId: 'cs_test_idempotente' })

    expect(first).toBe('paid')
    expect(second).toBe('already_paid')

    const orders = await prisma.order.count({ where: { stripeSessionId: 'cs_test_idempotente' } })
    expect(orders).toBe(1)

    const updatedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
    expect(updatedProduct.stock).toBe(8)
  })

  it('devuelve not_found si la sesión no corresponde a ninguna orden', async () => {
    const result = await processCheckoutCompleted({ sessionId: 'cs_test_desconocida' })
    expect(result).toBe('not_found')
  })

  it('cancela la orden si no hay stock suficiente', async () => {
    const { order, product } = await createOrderWithProduct({
      stock: 1,
      quantity: 3,
      stripeSessionId: 'cs_test_sin_stock',
    })

    const result = await processCheckoutCompleted({ sessionId: 'cs_test_sin_stock' })

    expect(result).toBe('insufficient_stock')

    const updated = await prisma.order.findUniqueOrThrow({ where: { id: order.id } })
    expect(updated.status).toBe('CANCELLED')
    expect(updated.paymentStatus).toBe('FAILED')

    const updatedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
    expect(updatedProduct.stock).toBe(1)
  })

  it('no deja el stock en negativo con dos compras concurrentes del último producto', async () => {
    const user = await createUser()
    const product = await createProduct({ priceCents: 1000, stock: 1 })

    const orders = await Promise.all(
      ['cs_test_concurrente_a', 'cs_test_concurrente_b'].map((sessionId) =>
        createPendingOrder({
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
        }).then((order) =>
          prisma.order
            .update({ where: { id: order.id }, data: { stripeSessionId: sessionId } })
            .then(() => processCheckoutCompleted({ sessionId })),
        ),
      ),
    )

    expect(orders.sort()).toEqual(['insufficient_stock', 'paid'])

    const updatedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
    expect(updatedProduct.stock).toBe(0)
    expect(updatedProduct.stock).toBeGreaterThanOrEqual(0)
  })

  it('vacía el carrito una vez confirmado el pago', async () => {
    const { product } = await createOrderWithProduct({ stripeSessionId: 'cs_test_carrito' })
    const cart = await prisma.cart.create({ data: { guestHash: 'hash-de-prueba' } })
    await prisma.cartItem.create({ data: { cartId: cart.id, productId: product.id, quantity: 1 } })

    await processCheckoutCompleted({ sessionId: 'cs_test_carrito', cartId: cart.id })

    const items = await prisma.cartItem.findMany({ where: { cartId: cart.id } })
    expect(items).toHaveLength(0)
  })
})

describe('processPaymentFailed', () => {
  it('marca la orden como fallida', async () => {
    const { order } = await createOrderWithProduct({ stripeSessionId: 'cs_test_fallida' })
    await prisma.order.update({
      where: { id: order.id },
      data: { stripePaymentIntentId: 'pi_test_fallido' },
    })

    const result = await processPaymentFailed('pi_test_fallido')

    expect(result).toBe('paid')
    const updated = await prisma.order.findUniqueOrThrow({ where: { id: order.id } })
    expect(updated.paymentStatus).toBe('FAILED')
    expect(updated.status).toBe('CANCELLED')
  })

  it('devuelve not_found si no hay orden con ese payment intent', async () => {
    await expect(processPaymentFailed('pi_inexistente')).resolves.toBe('not_found')
  })
})

describe('markOrderPaid', () => {
  it('marca la orden como pagada y reserva el stock', async () => {
    const { order, product } = await createOrderWithProduct({ stock: 10, quantity: 2 })

    const result = await markOrderPaid(order.id)

    expect(result).toBe('paid')
    const updated = await prisma.order.findUniqueOrThrow({ where: { id: order.id } })
    expect(updated.status).toBe('PAID')
    expect(updated.paymentStatus).toBe('PAID')

    const updatedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
    expect(updatedProduct.stock).toBe(8)
  })

  it('no descuenta el stock dos veces si se repite la llamada', async () => {
    const { order, product } = await createOrderWithProduct({ stock: 10, quantity: 2 })

    expect(await markOrderPaid(order.id)).toBe('paid')
    expect(await markOrderPaid(order.id)).toBe('already_paid')

    const updatedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
    expect(updatedProduct.stock).toBe(8)
  })

  it('cancela la orden cuando no hay stock suficiente', async () => {
    const { order, product } = await createOrderWithProduct({ stock: 1, quantity: 3 })

    const result = await markOrderPaid(order.id)

    expect(result).toBe('insufficient_stock')
    const updated = await prisma.order.findUniqueOrThrow({ where: { id: order.id } })
    expect(updated.status).toBe('CANCELLED')
    expect(updated.paymentStatus).toBe('FAILED')

    const updatedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
    expect(updatedProduct.stock).toBe(1)
  })

  it('devuelve not_found si la orden no existe', async () => {
    await expect(markOrderPaid('orden_inexistente')).resolves.toBe('not_found')
  })
})

describe('cancelUnpaidOrder', () => {
  it('cierra la orden pendiente para que no quede colgada', async () => {
    const { order } = await createOrderWithProduct({})

    await cancelUnpaidOrder(order.id)

    const updated = await prisma.order.findUniqueOrThrow({ where: { id: order.id } })
    expect(updated.status).toBe('CANCELLED')
    expect(updated.paymentStatus).toBe('FAILED')
  })

  it('no toca una orden que ya fue pagada', async () => {
    const { order } = await createOrderWithProduct({})
    await markOrderPaid(order.id)

    await cancelUnpaidOrder(order.id)

    const updated = await prisma.order.findUniqueOrThrow({ where: { id: order.id } })
    expect(updated.status).toBe('PAID')
    expect(updated.paymentStatus).toBe('PAID')
  })
})
