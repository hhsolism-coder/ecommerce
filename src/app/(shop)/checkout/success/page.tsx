import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle2, Clock3, SearchX } from 'lucide-react'
import { prisma } from '@/lib/db'
import { formatMoney } from '@/lib/money'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/container'

export async function generateMetadata({
  searchParams,
}: PageProps<'/checkout/success'>): Promise<Metadata> {
  const params = await searchParams
  const sessionId = typeof params.session_id === 'string' ? params.session_id : ''

  if (!sessionId) return { title: 'Resultado del pago' }

  const order = await prisma.order.findUnique({
    where: { stripeSessionId: sessionId },
    select: { paymentStatus: true },
  })

  if (!order) return { title: 'Pedido no encontrado' }
  return { title: order.paymentStatus === 'PAID' ? 'Pago completado' : 'Pago en revisión' }
}

export default async function CheckoutSuccessPage({ searchParams }: PageProps<'/checkout/success'>) {
  const params = await searchParams
  const sessionId = typeof params.session_id === 'string' ? params.session_id : ''

  const order = sessionId
    ? await prisma.order.findUnique({
        where: { stripeSessionId: sessionId },
        include: { items: true },
      })
    : null

  if (!order) {
    return (
      <Container size="reading" className="py-16">
        <div className="rounded-lg bg-card px-6 py-12 text-center ring-1 ring-foreground/10">
          <SearchX className="mx-auto size-8 text-muted-foreground" />
          <h1 className="mt-5 font-heading text-2xl font-semibold tracking-tight">
            No encontramos ese pedido
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Revisá el enlace de pago que recibiste o mirá el historial de tu cuenta. Si ya pagaste, la
            confirmación puede tardar unos segundos.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Button asChild>
              <Link href="/account">Ver mis pedidos</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/products">Seguir comprando</Link>
            </Button>
          </div>
        </div>
      </Container>
    )
  }

  const confirmed = order.paymentStatus === 'PAID'

  return (
    <Container size="reading" className="py-16">
      <div className="text-center">
        {confirmed ? (
          <CheckCircle2 className="mx-auto size-9 text-success" />
        ) : (
          <Clock3 className="mx-auto size-9 text-caution" />
        )}
        <p className="stamp mt-5 text-primary">{order.orderNumber}</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight text-balance">
          {confirmed ? '¡Pago completado!' : 'Estamos confirmando tu pago'}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {confirmed
            ? 'Tu pedido fue pagado y ya está confirmado.'
            : 'Stripe procesó el pago. La confirmación final llega por webhook y puede tardar unos segundos.'}
        </p>
      </div>

      <div className="mt-8 overflow-hidden rounded-lg bg-card ring-1 ring-foreground/10">
        <div className="flex items-baseline justify-between border-b border-border px-5 py-3">
          <span className="stamp text-muted-foreground">Comprobante</span>
          <span className="font-mono text-xs text-muted-foreground">
            {new Date(order.createdAt).toLocaleString('es-CL')}
          </span>
        </div>

        <ul className="flex flex-col gap-2.5 px-5 py-4 text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-baseline justify-between gap-4">
              <span className="text-muted-foreground">
                <span data-numeric className="font-mono">
                  {item.quantity}×
                </span>{' '}
                {item.nameSnapshot}
              </span>
              <span data-numeric className="font-mono tabular-nums">
                {formatMoney(item.unitPriceCents * item.quantity, order.currency)}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex items-baseline justify-between border-t border-border px-5 py-4">
          <span className="font-heading text-base font-medium">Total</span>
          <span data-numeric className="font-mono text-lg font-medium tabular-nums">
            {formatMoney(order.totalCents, order.currency)}
          </span>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/account">Ver mis pedidos</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/products">Seguir comprando</Link>
        </Button>
      </div>
    </Container>
  )
}
