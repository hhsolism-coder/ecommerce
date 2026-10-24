import Link from 'next/link'
import { formatMoney } from '@/lib/money'
import { AddToCartButton } from '@/components/add-to-cart-button'
import { ProductThumb } from '@/components/product-thumb'
import { cn } from '@/lib/utils'

export type ProductCardData = {
  id: string
  name: string
  slug: string
  priceCents: number
  currency: string
  stock: number
  imageUrl: string | null
  categoryName: string | null
  /** Cantidad de imágenes de la galería, para marcar la ficha. */
  imageCount?: number
}

/**
 * La ficha de producto: una hoja con membrete (categoría y stock), título,
 * precio en cifras tabulares y la acción. El link cubre toda la ficha; el
 * botón de agregar queda por encima para seguir siendo clicable.
 */
export function ProductCard({ product }: { product: ProductCardData }) {
  const outOfStock = product.stock <= 0

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-lg bg-card ring-1 ring-foreground/10 transition-shadow duration-200 hover:shadow-[0_1px_2px_-1px_rgba(0,0,0,0.06),0_4px_12px_-6px_rgba(0,0,0,0.12)]">
      <div className="relative aspect-4/3 overflow-hidden border-b border-border">
        <ProductThumb name={product.name} imageUrl={product.imageUrl} />
        {product.imageCount && product.imageCount > 1 ? (
          <span
            data-numeric
            className="stamp absolute right-2 bottom-2 rounded-md bg-card/90 px-1.5 py-1 text-foreground/75 backdrop-blur"
          >
            {product.imageCount} fotos
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="stamp text-muted-foreground">{product.categoryName ?? 'General'}</p>
          <p
            className={cn(
              'text-xs font-medium',
              outOfStock ? 'text-destructive' : 'text-success',
            )}
          >
            {outOfStock ? 'Agotado' : `${product.stock} disponibles`}
          </p>
        </div>

        <h3 className="font-heading text-base leading-snug font-medium">
          <Link href={`/products/${product.slug}`} className="after:absolute after:inset-0">
            {product.name}
          </Link>
        </h3>

        <p data-numeric className="font-mono text-lg font-medium tracking-tight">
          {formatMoney(product.priceCents, product.currency)}
        </p>

        <div className="relative z-10 mt-auto pt-2">
          <AddToCartButton
            productId={product.id}
            disabled={outOfStock}
            className="w-full disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
          />
        </div>
      </div>
    </article>
  )
}
