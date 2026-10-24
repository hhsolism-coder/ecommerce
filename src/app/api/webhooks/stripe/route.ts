import { NextResponse } from 'next/server'
import { getStripe, getWebhookSecret, isPlaceholderKey, isStripeConfigured } from '@/lib/stripe'
import { processCheckoutCompleted, processPaymentFailed } from '@/lib/orders'

// El SDK de Stripe no funciona en el runtime edge.
export const runtime = 'nodejs'

/**
 * Webhook de Stripe.
 *
 * El cuerpo se lee como texto plano (`request.text()`): si se parsea como JSON antes,
 * la firma deja de coincidir y Stripe rechaza el evento.
 */
export async function POST(request: Request) {
  // Una configuración incompleta no es un evento mal firmado: se responde 503
  // para que Stripe reintente y no se confunda con un rechazo de la firma.
  if (!isStripeConfigured() || isPlaceholderKey(process.env.STRIPE_WEBHOOK_SECRET)) {
    return NextResponse.json(
      { error: 'Stripe no está configurado (faltan STRIPE_SECRET_KEY o STRIPE_WEBHOOK_SECRET reales).' },
      { status: 503 },
    )
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Falta el encabezado stripe-signature.' }, { status: 400 })
  }

  const rawBody = await request.text()

  let event
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, getWebhookSecret())
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Firma inválida'
    return NextResponse.json({ error: `Firma inválida: ${message}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const paymentIntentId =
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : (session.payment_intent?.id ?? null)

        await processCheckoutCompleted({
          sessionId: session.id,
          paymentIntentId,
          cartId: session.client_reference_id ?? session.metadata?.cartId ?? null,
          email: session.customer_details?.email ?? session.customer_email ?? null,
        })
        break
      }
      case 'payment_intent.payment_failed': {
        await processPaymentFailed(event.data.object.id)
        break
      }
      default:
        // Eventos sin efecto para la orden se acknowledgean sin hacer nada.
        break
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: `Error procesando el evento: ${message}` }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

/**
 * GET en el webhook: responde 405 para que unhealth check no rompa nada.
 */
export async function GET() {
  return NextResponse.json({ error: 'Método no permitido' }, { status: 405 })
}
