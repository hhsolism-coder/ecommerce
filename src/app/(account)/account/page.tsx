import Link from 'next/link'
import { PackageOpen } from 'lucide-react'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/guards'
import { formatMoney } from '@/lib/money'
import { Container } from '@/components/container'
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/order-status-badge'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'

export const metadata = { title: 'Mi cuenta' }

export default async function AccountPage() {
  const user = await requireUser('/account')

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <Container className="py-10 md:py-12">
      <PageHeader
        eyebrow="Mi cuenta"
        title={user.name}
        description={`${user.email} · Rol ${user.role}`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/products">Seguir comprando</Link>
          </Button>
        }
      />

      <section className="mt-8">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-heading text-xl font-semibold tracking-tight">Mis pedidos</h2>
          <span className="stamp text-muted-foreground">
            {orders.length} pedido{orders.length === 1 ? '' : 's'}
          </span>
        </div>

        {orders.length === 0 ? (
          <div className="mt-4 rounded-lg bg-card ring-1 ring-foreground/10">
            <Empty className="py-14">
              <EmptyHeader>
                <EmptyMedia variant="icon" className="size-11 bg-secondary text-muted-foreground">
                  <PackageOpen className="size-5" />
                </EmptyMedia>
                <EmptyTitle className="font-heading text-lg">Todavía no tenés pedidos</EmptyTitle>
                <EmptyDescription>
                  Cuando compres algo, vas a ver acá el detalle y el estado de cada pedido.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button asChild>
                  <Link href="/products">Ver catálogo</Link>
                </Button>
              </EmptyContent>
            </Empty>
          </div>
        ) : (
          <ul className="mt-4 flex flex-col gap-4">
            {orders.map((order) => (
              <li key={order.id} className="overflow-hidden rounded-lg bg-card ring-1 ring-foreground/10">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 px-5 py-3">
                  <span className="font-mono text-sm font-medium">{order.orderNumber}</span>
                  <div className="flex items-center gap-2">
                    <OrderStatusBadge status={order.status} />
                    {/* El estado del pago solo se muestra cuando aporta información: si el
                        pedido ya está pagado, dos etiquetas «Pagado» serían redundantes. */}
                    {order.paymentStatus !== order.status ? (
                      <PaymentStatusBadge status={order.paymentStatus} />
                    ) : null}
                  </div>
                </div>

                <div className="px-5 py-4">
                  <ul className="flex flex-col gap-1.5 text-sm">
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

                  <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-border pt-3">
                    <span className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString('es-CL')}
                    </span>
                    <span data-numeric className="font-mono text-lg font-medium tabular-nums">
                      {formatMoney(order.totalCents, order.currency)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Container>
  )
}
