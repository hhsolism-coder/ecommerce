import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/guards'
import { formatMoney } from '@/lib/money'
import { OrderStatusFilter } from '@/components/admin/order-status-filter'
import { OrderStatusForm } from '@/components/admin/order-status-form'
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/order-status-badge'
import { PageHeader } from '@/components/page-header'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export const metadata = { title: 'Administrar pedidos' }

export default async function AdminOrdersPage({ searchParams }: PageProps<'/admin/orders'>) {
  await requireAdmin('/admin/orders')

  const params = await searchParams
  const statusFilter = typeof params.status === 'string' ? params.status : ''
  const validStatus = ['PENDING', 'PAID', 'FULFILLED', 'CANCELLED'].includes(statusFilter)
    ? statusFilter
    : undefined

  const orders = await prisma.order.findMany({
    where: validStatus ? { status: validStatus as 'PENDING' | 'PAID' | 'FULFILLED' | 'CANCELLED' } : undefined,
    include: { items: true, user: { select: { email: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Ventas"
        title="Pedidos"
        description={`${orders.length} pedido${orders.length === 1 ? '' : 's'} en el listado actual.`}
      />

      <OrderStatusFilter current={validStatus ?? ''} />

      <div className="overflow-hidden rounded-lg bg-card ring-1 ring-foreground/10">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="stamp">Pedido</TableHead>
                <TableHead className="stamp">Cliente</TableHead>
                <TableHead className="stamp text-right">Total</TableHead>
                <TableHead className="stamp">Pago</TableHead>
                <TableHead className="stamp">Estado</TableHead>
                <TableHead className="stamp text-right">Transición</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                    No hay pedidos para mostrar.
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <span className="block font-mono text-sm font-medium">{order.orderNumber}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString('es-CL')}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {order.user?.name ?? (order.email || 'Invitado')}
                    </TableCell>
                    <TableCell data-numeric className="text-right font-mono tabular-nums">
                      {formatMoney(order.totalCents, order.currency)}
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={order.paymentStatus} />
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell>
                      <OrderStatusForm orderId={order.id} currentStatus={order.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Al cancelar un pedido se devuelve el stock de sus productos.{' '}
        <Link href="/admin" className="underline underline-offset-4">
          Volver al resumen
        </Link>
      </p>
    </div>
  )
}
