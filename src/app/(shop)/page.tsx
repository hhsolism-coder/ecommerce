import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { prisma } from '@/lib/db'
import { Container } from '@/components/container'
import { ProductCard } from '@/components/product-card'
import { Button } from '@/components/ui/button'

export default async function HomePage() {
  const [products, categories, stockTotal, productCount] = await Promise.all([
    prisma.product.findMany({
      where: { status: 'ACTIVE' },
      include: { category: true, _count: { select: { images: true } } },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    }),
    prisma.product.aggregate({
      where: { status: 'ACTIVE' },
      _sum: { stock: true },
    }),
    prisma.product.count({ where: { status: 'ACTIVE' } }),
  ])

  const units = stockTotal._sum.stock ?? 0

  return (
    <Container size="wide" className="py-10 md:py-14">
      <section className="grid gap-10 border-b border-border pb-12 lg:grid-cols-[1.35fr_1fr] lg:gap-16">
        <div>
          <p className="stamp text-primary">Catálogo de temporada</p>
          <h1 className="mt-4 font-heading text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Objetos que duran más que la moda
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground text-pretty">
            Camisetas de algodón pesado, accesorios de cuero y piezas para el hogar. Stock real
            en depósito, carrito persistente y pago con Stripe.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="h-11 px-6">
              <Link href="/products">Ver catálogo</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-11 px-6">
              <Link href="/products?category=camisetas">Novedades de algodón</Link>
            </Button>
          </div>
        </div>

        <dl className="grid grid-cols-3 gap-px self-end overflow-hidden rounded-lg bg-border ring-1 ring-foreground/10">
          {[
            { label: 'Productos', value: productCount, note: 'en catálogo' },
            { label: 'Categorías', value: categories.length, note: 'activas' },
            { label: 'Unidades', value: units, note: 'en stock' },
          ].map((stat) => (
            <div key={stat.label} className="bg-card px-4 py-5">
              <dt className="stamp text-muted-foreground">{stat.label}</dt>
              <dd
                data-numeric
                className="mt-2 font-mono text-2xl font-medium tracking-tight tabular-nums"
              >
                {stat.value}
              </dd>
              <p className="mt-1 text-xs text-muted-foreground">{stat.note}</p>
            </div>
          ))}
        </dl>
      </section>

      {categories.length > 0 ? (
        <section className="py-12">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-heading text-2xl font-semibold tracking-tight">Categorías</h2>
            <span className="stamp text-muted-foreground">{categories.length} grupos</span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {categories.map((category, index) => (
              <Link
                key={category.id}
                href={`/products?category=${category.slug}`}
                className="group flex items-center justify-between gap-4 rounded-lg bg-card px-5 py-5 ring-1 ring-foreground/10 transition-colors hover:bg-accent/60"
              >
                <span className="flex items-baseline gap-4">
                  <span className="font-mono text-xs text-muted-foreground">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span>
                    <span className="block font-heading text-lg font-medium">{category.name}</span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">
                      {category._count.products} productos
                    </span>
                  </span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="pb-4">
        <div className="flex items-baseline justify-between gap-4 border-b border-border pb-4">
          <h2 className="font-heading text-2xl font-semibold tracking-tight">Novedades</h2>
          <Link
            href="/products"
            className="group flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            Ver todo
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-border bg-card/60 px-6 py-12 text-center">
            <p className="font-heading text-lg font-medium">Todavía no hay productos</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Ejecutá <code className="font-mono">npm run db:seed</code> para cargar los datos de
              demostración.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
      </section>
    </Container>
  )
}
