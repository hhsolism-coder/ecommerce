import Link from 'next/link'
import { ArrowUpRight, PackageX } from 'lucide-react'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/guards'
import { formatMoney } from '@/lib/money'
import { PageHeader } from '@/components/page-header'

export const metadata = { title: 'Panel de administración' }

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagado',
  FULFILLED: 'Entregado',
  CANCELLED: 'Cancelado',
}

export default async function AdminDashboardPage() {
  await requireAdmin('/admin')

  const [ordersByStatus, paidRevenue, lowStock, productCount, userCount] = await Promise.all([
    prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.order.aggregate({
      where: { paymentStatus: 'PAID' },
      _sum: { totalCents: true },
      _count: { _all: true },
    }),
    prisma.product.findMany({
      where: { status: 'ACTIVE', stock: { lte: 3 } },
      orderBy: { stock: 'asc' },
      take: 8,
    }),
    prisma.product.count({ where: { status: 'ACTIVE' } }),
    prisma.user.count(),
  ])

  const revenueCents = paidRevenue._sum.totalCents ?? 0
  const maxOrders = Math.max(1, ...ordersByStatus.map((row) => row._count._all))

  return (
    <div className="flex flex-col gap-8">
        <PageHeader
          eyebrow="Panel"
          title="Resumen"
          description="Estado de la tienda: ventas, catálogo y usuarios."
        />

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-foreground p-6 text-background">
            <p className="stamp text-background/70">Ingresos pagados</p>
            <p
              data-numeric
              className="mt-3 font-mono text-4xl font-medium tracking-tight tabular-nums"
            >
              {formatMoney(revenueCents)}
            </p>
            <p className="mt-2 text-sm text-background/70">
              {paidRevenue._count._all} pedido{paidRevenue._count._all === 1 ? '' : 's'} cobrado
              {paidRevenue._count._all === 1 ? '' : 's'}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 md:col-span-2">
            {[
              { label: 'Productos activos', value: productCount, note: 'en catálogo' },
              { label: 'Usuarios', value: userCount, note: 'registrados' },
              { label: 'Pedidos pagados', value: paidRevenue._count._all, note: 'confirmados' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg bg-card p-5 ring-1 ring-foreground/10">
                <p className="stamp text-muted-foreground">{stat.label}</p>
                <p
                  data-numeric
                  className="mt-2 font-mono text-2xl font-medium tracking-tight tabular-nums"
                >
                  {stat.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{stat.note}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg bg-card p-5 ring-1 ring-foreground/10">
            <div className="flex items-baseline justify-between">
              <h2 className="font-heading text-lg font-semibold">Pedidos por estado</h2>
              <span className="stamp text-muted-foreground">
                {ordersByStatus.length} {ordersByStatus.length === 1 ? 'estado' : 'estados'}
              </span>
            </div>

            {ordersByStatus.length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">Todavía no hay pedidos.</p>
            ) : (
              <ul className="mt-5 flex flex-col gap-4">
                {ordersByStatus.map((row) => (
                  <li key={row.status}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-muted-foreground">
                        {STATUS_LABEL[row.status] ?? row.status}
                      </span>
                      <span data-numeric className="font-mono tabular-nums">
                        {row._count._all}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.round((row._count._all / maxOrders) * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg bg-card p-5 ring-1 ring-foreground/10">
            <div className="flex items-baseline justify-between">
              <h2 className="font-heading text-lg font-semibold">Stock bajo</h2>
              <span className="stamp text-muted-foreground">≤ 3 unidades</span>
            </div>

            {lowStock.length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">
                Todo el stock está por encima del mínimo.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {lowStock.map((product) => (
                  <li key={product.id} className="flex items-center justify-between gap-4 py-3">
                    <Link
                      href={`/admin/products/${product.id}/edit`}
                      className="group flex min-w-0 items-center gap-2 text-sm font-medium"
                    >
                      <PackageX className="size-4 shrink-0 text-caution" />
                      <span className="truncate">{product.name}</span>
                      <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </Link>
                    <span data-numeric className="font-mono text-sm tabular-nums">
                      {product.stock} uds.
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
    </div>
  )
}
