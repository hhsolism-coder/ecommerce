'use server'

import { prisma } from '@/lib/db'
import { getSessionUser } from '@/lib/auth/session'
import { getCartWithItems } from '@/lib/cart/cart-service'
import { cancelUnpaidOrder, createPendingOrder } from '@/lib/orders'
import { getAppUrl, getStripe, isStripeConfigured } from '@/lib/stripe'

export type CheckoutResult = { ok: true; url: string } | { ok: false; error: string }

/**
 * Crea la sesión de pago de Stripe a partir del carrito del servidor.
 *
 * Los precios y las cantidades NUNCA vienen del cliente: se releen del carrito en la
 * base de datos, de modo que un carrito manipulado no puede alterar el importe.
 */
export async function startCheckoutAction(): Promise<CheckoutResult> {
  if (!isStripeConfigured()) {
    return {
      ok: false,
      error:
        'Stripe no está configurado. Copia .env.example a .env y define STRIPE_SECRET_KEY para habilitar el pago.',
    }
  }

  const cart = await getCartWithItems()
  if (!cart || cart.lines.length === 0) {
    return { ok: false, error: 'Tu carrito está vacío.' }
  }

  const user = await getSessionUser()
  const currency = cart.lines[0]?.currency ?? 'usd'

  const order = await createPendingOrder({
    userId: user?.id ?? null,
    email: user?.email ?? '',
    lines: cart.lines,
    currency,
  })

  const stripe = getStripe()
  const appUrl = getAppUrl()

  let session
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: cart.lines.map((line) => ({
        quantity: line.quantity,
        price_data: {
          currency: (line.currency ?? currency).toLowerCase(),
          unit_amount: line.priceCents,
          product_data: { name: line.name },
        },
      })),
      ...(user?.email ? { customer_email: user.email } : {}),
      client_reference_id: cart.id,
      metadata: {
        cartId: cart.id,
        orderId: order.id,
        userId: user?.id ?? '',
      },
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/cart`,
    })
  } catch (error) {
    // Una clave inválida o sin permisos no debe romper la app con un 500:
    // se devuelve un mensaje accionable para el usuario. La orden queda
    // cerrada para que no aparezca como pendiente para siempre.
    await cancelUnpaidOrder(order.id)
    const detail = error instanceof Error ? error.message : 'error desconocido'
    return {
      ok: false,
      error: `No se pudo iniciar el pago con Stripe: ${detail}. Revisa STRIPE_SECRET_KEY en tu archivo .env.`,
    }
  }

  if (!session.url) {
    await cancelUnpaidOrder(order.id)
    return { ok: false, error: 'Stripe no devolvió una URL de pago. Intenta nuevamente.' }
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { stripeSessionId: session.id },
  })

  return { ok: true, url: session.url }
}
