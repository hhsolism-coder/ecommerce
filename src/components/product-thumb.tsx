import { cn } from '@/lib/utils'

/**
 * Imagen del producto. Cuando la ficha no tiene imagen, el vacío se diseña
 * como una etiqueta de papel en vez de un recuadro gris con "Sin imagen".
 */
export function ProductThumb({
  name,
  imageUrl,
  className,
}: {
  name: string
  imageUrl: string | null
  className?: string
}) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={name}
        className={cn('h-full w-full object-cover', className)}
      />
    )
  }

  const initial = name.trim().charAt(0).toUpperCase()

  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex h-full w-full items-center justify-center bg-secondary/45 text-muted-foreground',
        className,
      )}
    >
      <span className="flex size-14 items-center justify-center rounded-lg border border-dashed border-foreground/15 font-heading text-2xl font-semibold text-foreground/25">
        {initial}
      </span>
    </div>
  )
}
