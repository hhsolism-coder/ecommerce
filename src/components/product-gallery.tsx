'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ProductThumb } from '@/components/product-thumb'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type ProductGalleryImage = {
  url: string
  alt?: string | null
  credit?: string | null
}

/**
 * Galería de la ficha de producto: una imagen grande y la tira de miniaturas.
 * Si el producto no tiene imágenes, cae en la etiqueta de papel del placeholder.
 */
export function ProductGallery({
  name,
  images,
  fallbackImageUrl,
  className,
}: {
  name: string
  images: ProductGalleryImage[]
  fallbackImageUrl?: string | null
  className?: string
}) {
  const [active, setActive] = useState(0)

  const gallery: ProductGalleryImage[] =
    images.length > 0 ? images : fallbackImageUrl ? [{ url: fallbackImageUrl }] : []
  const index = gallery.length > 0 ? Math.min(active, gallery.length - 1) : 0
  const current = gallery[index]

  function move(step: number) {
    if (gallery.length === 0) return
    setActive((index + step + gallery.length) % gallery.length)
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="relative overflow-hidden rounded-lg border border-border bg-card">
        <div className="aspect-4/3">
          {current ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={current.url}
              src={current.url}
              alt={current.alt ?? name}
              className="h-full w-full object-cover"
            />
          ) : (
            <ProductThumb name={name} imageUrl={null} />
          )}
        </div>

        {gallery.length > 1 ? (
          <>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label="Imagen anterior"
              onClick={() => move(-1)}
              className="absolute top-1/2 left-3 -translate-y-1/2 rounded-full bg-card/90 shadow-sm backdrop-blur hover:bg-card"
            >
              <ChevronLeft />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label="Imagen siguiente"
              onClick={() => move(1)}
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full bg-card/90 shadow-sm backdrop-blur hover:bg-card"
            >
              <ChevronRight />
            </Button>
            <span
              data-numeric
              className="stamp absolute right-3 bottom-3 rounded-md bg-card/90 px-2 py-1 text-foreground/80 shadow-sm backdrop-blur"
            >
              {index + 1} / {gallery.length}
            </span>
          </>
        ) : null}
      </div>

      {gallery.length > 1 ? (
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {gallery.map((image, position) => (
            <li key={image.url}>
              <button
                type="button"
                onClick={() => setActive(position)}
                aria-label={`Ver imagen ${position + 1} de ${gallery.length}`}
                aria-current={position === index ? 'true' : undefined}
                className={cn(
                  'block size-16 overflow-hidden rounded-md border transition focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:size-20',
                  position === index
                    ? 'border-primary ring-1 ring-primary'
                    : 'border-border opacity-65 hover:opacity-100',
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt="" className="h-full w-full object-cover" loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {current?.credit ? (
        <p className="text-xs text-muted-foreground">Foto: {current.credit}</p>
      ) : null}
    </div>
  )
}
