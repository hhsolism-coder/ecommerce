import { randomBytes } from 'node:crypto'
import { prisma } from '@/lib/db'
import { calculateCartTotals, type CartLine } from './cart/calc'

export class InsufficientStockError extends Error {
  constructor(public readonly productName: string) {
    super(`Stock insuficiente para ${productName}`)
    this.name = 'InsufficientStockError'
  }
}

export class AlreadyPaidError extends Error {
  constructor() {
    super('La orden ya fue pagada')
    this.name = 'AlreadyPaidError'
  }
}

/**
 * Número de pedido legible y único: ECOM-AAAAMMDD-XXXXXX
 */
export function buildOrderNumber(now: Date = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const suffix = randomBytes(3).toString('hex').toUpperCase()
  return `ECOM-${year}${month}${day}-${suffix}`
}

/**
 * Crea la orden en estado PENDING/UNPAID al generar la sesión de Stripe.
 *
 * Esto deja los carritos abandonados visibles para el admin y hace que el webhook
 * sea idempotente (la orden se identifica por `stripeSessionId`, que es @unique).
 */
export async function createPendingOrder(input: {
  userId: string | null
  email: string
  lines: CartLine[]
  currency?: string
}) {
  const totals = calculateCartTotals(input.lines)

  return prisma.order.create({
    data: {
      orderNumber: buildOrderNumber(),
      userId: input.userId,
      email: input.email,
      status: 'PENDING',
      paymentStatus: 'UNPAID',
      subtotalCents: totals.subtotalCents,
      totalCents: totals.totalCents,
      currency: input.currency ?? 'usd',
      items: {
        create: input.lines.map((line) => ({
          productId: line.productId,
          nameSnapshot: line.name,
          unitPriceCents: line.priceCents,
          quantity: line.quantity,
        })),
      },
    },
    include: { items: true },
  })
}

export type WebhookResult = 'paid' | 'already_paid' | 'insufficient_stock' | 'not_found'

/**
 * Marca una orden como pagada y reserva el stock.
 *
 * Es la única fuente de verdad del pago: la usan tanto el webhook de Stripe
 * como el camino manual del panel admin, para que marcar y cancelar un pedido
 * nunca dejen el stock descuadrado.
 *
 * Idempotente: si la orden ya está pagada no vuelve a descontar stock.
 */
export async function markOrderPaid(
  orderId: string,
  input: { paymentIntentId?: string | null; email?: string | null; cartId?: string | null } = {},
): Promise<WebhookResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  })

  if (!order) return 'not_found'
  if (order.paymentStatus === 'PAID') return 'already_paid'

  try {
    await prisma.$transaction(async (tx) => {
      // `paymentStatus: { not: 'PAID' }` hace que solo una transacción concurrente
      // pueda marcar la orden como pagada.
      const updated = await tx.order.updateMany({
        where: { id: order.id, paymentStatus: { not: 'PAID' } },
        data: {
          status: 'PAID',
          paymentStatus: 'PAID',
          ...(input.paymentIntentId ? { stripePaymentIntentId: input.paymentIntentId } : {}),
          ...(input.email ? { email: input.email } : {}),
        },
      })

      if (updated.count === 0) throw new AlreadyPaidError()

      for (const item of order.items) {
        const result = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        })
        if (result.count === 0) throw new InsufficientStockError(item.nameSnapshot)
      }
    })
  } catch (error) {
    if (error instanceof AlreadyPaidError) return 'already_paid'
    if (error instanceof InsufficientStockError) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED', paymentStatus: 'FAILED' },
      })
      return 'insufficient_stock'
    }
    throw error
  }

  if (input.cartId) {
    await prisma.cartItem.deleteMany({ where: { cartId: input.cartId } })
  }

  return 'paid'
}

/**
 * Cierra una orden que nunca llegó a pagarse (por ejemplo, si Stripe rechaza
 * la clave). Evita que queden pedidos PENDING para siempre en el panel.
 */
export async function cancelUnpaidOrder(orderId: string): Promise<void> {
  await prisma.order.updateMany({
    where: { id: orderId, paymentStatus: { not: 'PAID' } },
    data: { status: 'CANCELLED', paymentStatus: 'FAILED' },
  })
}

/**
 * Procesa `checkout.session.completed`.
 *
 * Idempotente: si la orden ya está pagada no vuelve a descontar stock.
 * El descuento usa `updateMany` condicional (`stock >= qty`) dentro de una transacción,
 * de modo que dos compras concurrentes nunca dejan el stock en negativo.
 */
export async function processCheckoutCompleted(input: {
  sessionId: string
  paymentIntentId?: string | null
  cartId?: string | null
  email?: string | null
}): Promise<WebhookResult> {
  const order = await prisma.order.findUnique({
    where: { stripeSessionId: input.sessionId },
    select: { id: true },
  })

  if (!order) return 'not_found'

  return markOrderPaid(order.id, input)
}

/**
 * Procesa `payment_intent.payment_failed`.
 */
export async function processPaymentFailed(paymentIntentId: string): Promise<WebhookResult> {
  const order = await prisma.order.findUnique({ where: { stripePaymentIntentId: paymentIntentId } })
  if (!order) return 'not_found'
  if (order.paymentStatus === 'PAID') return 'already_paid'

  await prisma.order.updateMany({
    where: { id: order.id, paymentStatus: { not: 'PAID' } },
    data: { status: 'CANCELLED', paymentStatus: 'FAILED' },
  })

  return 'paid'
}

/**
 * Devuelve el stock de un pedido cancelado (usado por el panel admin).
 */
export async function restoreOrderStock(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } })
  if (!order) return

  await prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      })
    }
  })
}
