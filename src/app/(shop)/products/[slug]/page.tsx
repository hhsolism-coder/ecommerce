import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, CreditCard, PackageCheck, Truck } from 'lucide-react'
import { prisma } from '@/lib/db'
import { formatMoney } from '@/lib/money'
import { AddToCartButton } from '@/components/add-to-cart-button'
import { Container } from '@/components/container'
import { ProductGallery } from '@/components/product-gallery'
import { Badge } from '@/components/ui/badge'

export async function generateMetadata({ params }: PageProps<'/products/[slug]'>) {
  const { slug } = await params
  const product = await prisma.product.findUnique({ where: { slug } })
  if (!product) return { title: 'Producto no encontrado' }
  return { title: product.name, description: product.description.slice(0, 160) }
}

export default async function ProductDetailPage({ params }: PageProps<'/products/[slug]'>) {
  const { slug } = await params

  const product = await prisma.product.findFirst({
    where: { slug, status: { not: 'DRAFT' } },
    include: { category: true, images: { orderBy: { position: 'asc' } } },
  })

  if (!product) notFound()

  const outOfStock = product.stock <= 0

  return (
    <Container className="py-10 md:py-12">
      <Link
        href="/products"
        className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
        Volver al catálogo
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <ProductGallery
          name={product.name}
          images={product.images.map((image) => ({
            url: image.url,
            alt: image.alt,
            credit: image.credit,
          }))}
          fallbackImageUrl={product.imageUrl}
        />

        <div className="flex flex-col">
          <div className="flex flex-wrap items-center gap-3">
            {product.category ? (
              <Link
                href={`/products?category=${product.category.slug}`}
                className="stamp text-primary transition-opacity hover:opacity-75"
              >
                {product.category.name}
              </Link>
            ) : (
              <span className="stamp text-muted-foreground">General</span>
            )}

            {outOfStock ? (
              <Badge variant="destructive">Agotado</Badge>
            ) : (
              <Badge variant="secondary" className="gap-1.5">
                <span className="size-1.5 rounded-full bg-success" />
                {product.stock} disponibles
              </Badge>
            )}
          </div>

          <h1 className="mt-4 font-heading text-3xl leading-tight font-semibold tracking-tight text-balance md:text-4xl">
            {product.name}
          </h1>

          <p data-numeric className="mt-4 font-mono text-3xl font-medium tracking-tight tabular-nums">
            {formatMoney(product.priceCents, product.currency)}
          </p>

          <p className="mt-6 leading-relaxed text-muted-foreground text-pretty">
            {product.description}
          </p>

          <div className="mt-8">
            <AddToCartButton
              productId={product.id}
              disabled={outOfStock}
              className="h-11 w-full sm:w-auto sm:px-7"
            />
          </div>

          <dl className="mt-10 grid gap-px overflow-hidden rounded-lg bg-border ring-1 ring-foreground/10 sm:grid-cols-3">
            {[
              { icon: PackageCheck, label: 'Stock', value: 'En depósito' },
              { icon: CreditCard, label: 'Pago', value: 'Stripe test' },
              { icon: Truck, label: 'Carrito', value: 'Persistente' },
            ].map((fact) => (
              <div key={fact.label} className="bg-card px-4 py-4">
                <dt className="flex items-center gap-2 stamp text-muted-foreground">
                  <fact.icon className="size-3.5" />
                  {fact.label}
                </dt>
                <dd className="mt-1.5 text-sm font-medium">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </Container>
  )
}
