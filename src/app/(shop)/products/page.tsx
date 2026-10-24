import Link from 'next/link'
import type { Prisma } from '@/generated/prisma/client'
import { PackageSearch } from 'lucide-react'
import { prisma } from '@/lib/db'
import { CatalogFilters } from '@/components/catalog-filters'
import { Container } from '@/components/container'
import { PageHeader } from '@/components/page-header'
import { ProductCard } from '@/components/product-card'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'

const PAGE_SIZE = 12

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

export default async function ProductsPage({ searchParams }: PageProps<'/products'>) {
  const params = await searchParams
  const query = firstValue(params.q).trim()
  const categorySlug = firstValue(params.category).trim()
  const rawPage = Number.parseInt(firstValue(params.page), 10)
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1

  const where: Prisma.ProductWhereInput = { status: 'ACTIVE' }

  if (query) {
    where.OR = [
      { name: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
    ]
  }

  if (categorySlug) {
    where.category = { slug: categorySlug }
  }

  const [products, total, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true, _count: { select: { images: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function buildHref(next: { q?: string; category?: string; page?: number }): string {
    const search = new URLSearchParams()
    const q = next.q ?? query
    const category = next.category ?? categorySlug
    const targetPage = next.page ?? page

    if (q) search.set('q', q)
    if (category) search.set('category', category)
    if (targetPage > 1) search.set('page', String(targetPage))

    const queryString = search.toString()
    return queryString ? `/products?${queryString}` : '/products'
  }

  return (
    <Container className="py-10 md:py-12">
      <PageHeader
        eyebrow="Catálogo"
        title="Todos los productos"
        description={`${total} producto${total === 1 ? '' : 's'} disponible${total === 1 ? '' : 's'} en depósito. Filtrá por nombre o categoría.`}
      />

      <div className="mt-8">
        <CatalogFilters
          query={query}
          category={categorySlug}
          categories={categories.map((category) => ({
            id: category.id,
            name: category.name,
            slug: category.slug,
          }))}
        />
      </div>

      {products.length === 0 ? (
        <div className="mt-8 rounded-lg bg-card ring-1 ring-foreground/10">
          <Empty className="py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon" className="size-11 bg-secondary text-muted-foreground">
                <PackageSearch className="size-5" />
              </EmptyMedia>
              <EmptyTitle className="font-heading text-lg">Sin resultados</EmptyTitle>
              <EmptyDescription>
                No encontramos productos con esos filtros. Probá con otro término o quitá el filtro de
                categoría.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild variant="outline">
                <Link href="/products">Limpiar filtros</Link>
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={{
                id: product.id,
                name: product.name,
                slug: product.slug,
                priceCents: product.priceCents,
                currency: product.currency,
                stock: product.stock,
                imageUrl: product.imageUrl,
                categoryName: product.category?.name ?? null,
                imageCount: product._count.images,
              }}
            />
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <nav className="mt-10 flex items-center justify-between gap-4 border-t border-border pt-6">
          {page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={buildHref({ page: page - 1 })}>← Anterior</Link>
            </Button>
          ) : (
            <span />
          )}

          <p className="stamp text-muted-foreground">
            Página <span data-numeric>{page}</span> de <span data-numeric>{totalPages}</span>
          </p>

          {page < totalPages ? (
            <Button asChild variant="outline" size="sm">
              <Link href={buildHref({ page: page + 1 })}>Siguiente →</Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </Container>
  )
}
