'use client'

import { LockKeyhole } from 'lucide-react'
import { formatMoney } from '@/lib/money'
import { Button } from '@/components/ui/button'

export function CartSummary({
  subtotalCents,
  totalCents,
  itemCount,
  currency = 'usd',
  disabled = false,
  pending = false,
  error,
  onCheckout,
}: {
  subtotalCents: number
  totalCents: number
  itemCount: number
  currency?: string
  disabled?: boolean
  pending?: boolean
  error?: string | null
  onCheckout: () => void
}) {
  const isEmpty = itemCount === 0

  return (
    <div className="flex flex-col gap-4 rounded-lg bg-card p-5 ring-1 ring-foreground/10">
      <div>
        <p className="stamp text-muted-foreground">Resumen</p>
        <h2 className="mt-1.5 font-heading text-lg font-semibold">Tu pedido</h2>
      </div>

      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">{`Productos (${itemCount})`}</span>
        <span data-numeric className="font-mono tabular-nums">
          {formatMoney(subtotalCents, currency)}
        </span>
      </div>

      <div className="flex items-baseline justify-between border-t border-border pt-4">
        <span className="font-heading text-base font-medium">Total</span>
        <span
          data-numeric
          className="font-mono text-xl font-medium tracking-tight tabular-nums"
        >
          {formatMoney(totalCents, currency)}
        </span>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button
        type="button"
        onClick={onCheckout}
        disabled={disabled || isEmpty || pending}
        className="h-10 w-full"
      >
        {pending ? 'Redirigiendo al pago…' : 'Pagar con Stripe'}
      </Button>

      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <LockKeyhole className="mt-0.5 size-3.5 shrink-0" />
        Te redirigimos a Stripe para completar el pago. Los datos de tu tarjeta no pasan por esta tienda.
      </p>
    </div>
  )
}
