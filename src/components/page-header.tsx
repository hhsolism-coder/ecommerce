import { cn } from '@/lib/utils'

/**
 * Encabezado de página con la misma gramática en toda la tienda:
 * un sello en versalitas, el titular en Fraunces y una línea de tinta que
 * separa la cabecera del contenido.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <header className={cn('border-b border-border pb-6', className)}>
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          {eyebrow ? <p className="stamp text-primary">{eyebrow}</p> : null}
          <h1 className="mt-2 font-heading text-3xl leading-tight font-semibold tracking-tight text-balance md:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty md:text-base">
              {description}
            </p>
          ) : null}
        </div>

        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  )
}
