import Link from 'next/link'
import { Plus, Search } from 'lucide-react'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/guards'
import { formatMoney } from '@/lib/money'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export const metadata = { title: 'Administrar productos' }

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: 'bg-success/12 text-success ring-1 ring-success/25',
  DRAFT: 'bg-muted text-muted-foreground ring-1 ring-border',
  ARCHIVED: 'bg-muted text-muted-foreground ring-1 ring-border',
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Activo',
  DRAFT: 'Borrador',
  ARCHIVED: 'Archivado',
}

export default async function AdminProductsPage({ searchParams }: PageProps<'/admin/products'>) {
  await requireAdmin('/admin/products')

  const params = await searchParams
  const query = typeof params.q === 'string' ? params.q.trim() : ''

  const products = await prisma.product.findMany({
    where: query
      ? { name: { contains: query, mode: 'insensitive' } }
      : undefined,
    include: { category: true, _count: { select: { images: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Catálogo"
        title="Productos"
        description={`${products.length} producto${products.length === 1 ? '' : 's'} en la base de datos.`}
        actions={
          <Button asChild>
            <Link href="/admin/products/new">
              <Plus />
              Nuevo producto
            </Link>
          </Button>
        }
      />

      <form action="/admin/products" method="get" className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-56 flex-col gap-1.5">
          <Label htmlFor="admin-product-search">Buscar</Label>
          <InputGroup className="h-9">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              id="admin-product-search"
              name="q"
              defaultValue={query}
              placeholder="Nombre del producto"
            />
          </InputGroup>
        </div>
        <Button type="submit" className="h-9">
          Buscar
        </Button>
      </form>

      <div className="overflow-hidden rounded-lg bg-card ring-1 ring-foreground/10">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="stamp">Producto</TableHead>
                <TableHead className="stamp">Categoría</TableHead>
                <TableHead className="stamp text-right">Precio</TableHead>
                <TableHead className="stamp text-right">Stock</TableHead>
                <TableHead className="stamp">Estado</TableHead>
                <TableHead className="stamp text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                    No hay productos para mostrar.
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="size-10 shrink-0 overflow-hidden rounded-md border border-border bg-secondary/40">
                          {product.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
                          ) : null}
                        </div>
                        <div>
                          <Link
                            href={`/products/${product.slug}`}
                            className="transition-colors hover:text-primary"
                          >
                            {product.name}
                          </Link>
                          <p data-numeric className="text-xs text-muted-foreground">
                            {product._count.images} {product._count.images === 1 ? 'foto' : 'fotos'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {product.category?.name ?? '—'}
                    </TableCell>
                    <TableCell data-numeric className="text-right font-mono tabular-nums">
                      {formatMoney(product.priceCents, product.currency)}
                    </TableCell>
                    <TableCell data-numeric className="text-right font-mono tabular-nums">
                      {product.stock}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`rounded-md px-2 py-0.5 ${
                          STATUS_STYLE[product.status] ?? STATUS_STYLE.DRAFT
                        }`}
                      >
                        {STATUS_LABEL[product.status] ?? product.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/products/${product.id}/edit`}>Editar</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
