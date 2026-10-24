import { cn } from '@/lib/utils'

const sizes = {
  default: 'max-w-6xl',
  wide: 'max-w-7xl',
  narrow: 'max-w-3xl',
  reading: 'max-w-2xl',
} as const

export type ContainerSize = keyof typeof sizes

/**
 * Ancho de página. El shop usa `default`, el panel de administración `wide`
 * (las tablas necesitan aire) y los formularios de cuenta `narrow`.
 */
export function Container({
  size = 'default',
  className,
  ...props
}: React.ComponentProps<'div'> & { size?: ContainerSize }) {
  return (
    <div className={cn('mx-auto w-full px-4 sm:px-6', sizes[size], className)} {...props} />
  )
}
