'use client'

import { Minus, Plus, Trash2 } from 'lucide-react'
import { formatMoney } from '@/lib/money'
import { Button } from '@/components/ui/button'

export type CartLineView = {
  itemId: string
  productId: string
  name: string
  priceCents: number
  currency: string
  quantity: number
  stock: number
}

export function CartLineRow({
  line,
  onQuantityChange,
  onRemove,
  disabled = false,
}: {
  line: CartLineView
  onQuantityChange: (itemId: string, quantity: number) => void
  onRemove: (itemId: string) => void
  disabled?: boolean
}) {
  const atMaxStock = line.quantity >= line.stock

  return (
    <li className="flex flex-col gap-4 border-b border-border py-5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
      <div className="min-w-0">
        <p className="font-heading text-base leading-snug font-medium">{line.name}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          <span data-numeric className="font-mono">
            {formatMoney(line.priceCents, line.currency)}
          </span>{' '}
          por unidad
        </p>
        {atMaxStock ? (
          <p className="mt-1.5 text-xs font-medium text-caution">Llegaste al stock disponible</p>
        ) : null}
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex items-center rounded-md border border-border bg-card">
          <button
            type="button"
            aria-label={`Quitar una unidad de ${line.name}`}
            disabled={disabled || line.quantity <= 1}
            onClick={() => onQuantityChange(line.itemId, line.quantity - 1)}
            className="flex size-9 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            <Minus className="size-3.5" />
          </button>

          <span
            aria-label={`Cantidad de ${line.name}`}
            data-numeric
            className="min-w-9 text-center font-mono text-sm tabular-nums"
          >
            {line.quantity}
          </span>

          <button
            type="button"
            aria-label={`Agregar una unidad de ${line.name}`}
            disabled={disabled || atMaxStock}
            onClick={() => onQuantityChange(line.itemId, line.quantity + 1)}
            className="flex size-9 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            <Plus className="size-3.5" />
          </button>
        </div>

        <span
          data-numeric
          className="min-w-24 text-right font-mono text-sm font-medium tabular-nums"
        >
          {formatMoney(line.priceCents * line.quantity, line.currency)}
        </span>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(line.itemId)}
          disabled={disabled}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-4" />
          <span className="sr-only">Eliminar</span>
        </Button>
      </div>
    </li>
  )
}
