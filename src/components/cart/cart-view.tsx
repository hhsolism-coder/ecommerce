'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { ShoppingBag } from 'lucide-react'
import { removeCartItemAction, updateCartItemAction } from '@/actions/cart'
import { startCheckoutAction } from '@/actions/checkout'
import { CartLineRow, type CartLineView } from '@/components/cart/cart-line-row'
import { CartSummary } from '@/components/cart/cart-summary'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'

export function CartView({
  lines,
  subtotalCents,
  totalCents,
  currency = 'usd',
}: {
  lines: CartLineView[]
  subtotalCents: number
  totalCents: number
  currency?: string
}) {
  const [items, setItems] = useState(lines)
  const [error, setError] = useState<string | null>(null)
  const [checkoutPending, setCheckoutPending] = useState(false)
  const [isPending, startTransition] = useTransition()

  const itemCount = items.reduce((total, item) => total + item.quantity, 0)

  function handleQuantityChange(itemId: string, quantity: number) {
    setError(null)
    const previous = items
    // Actualización optimista: el estado cambia ya y se revierte si el servidor rechaza.
    setItems((current) =>
      current.map((item) =>
        item.itemId === itemId ? { ...item, quantity: Math.max(1, quantity) } : item,
      ),
    )

    startTransition(async () => {
      const result = await updateCartItemAction(itemId, quantity)
      if (!result.ok) {
        setItems(previous)
        setError(result.error)
      }
    })
  }

  function handleRemove(itemId: string) {
    setError(null)
    const previous = items
    setItems((current) => current.filter((item) => item.itemId !== itemId))

    startTransition(async () => {
      const result = await removeCartItemAction(itemId)
      if (!result.ok) {
        setItems(previous)
        setError(result.error)
      }
    })
  }

  async function handleCheckout() {
    setError(null)
    setCheckoutPending(true)
    const result = await startCheckoutAction()

    if (!result.ok) {
      setError(result.error)
      setCheckoutPending(false)
      return
    }

    window.location.href = result.url
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg bg-card ring-1 ring-foreground/10">
        <Empty className="py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="size-11 bg-secondary text-muted-foreground">
              <ShoppingBag className="size-5" />
            </EmptyMedia>
            <EmptyTitle className="font-heading text-lg">Tu carrito está vacío</EmptyTitle>
            <EmptyDescription>
              Todavía no agregaste productos. Explorá el catálogo y armá tu pedido.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/products">Ver catálogo</Link>
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-10">
      <div className="lg:col-span-2">
        <div className="overflow-hidden rounded-lg bg-card ring-1 ring-foreground/10">
          <div className="hidden items-center justify-between gap-4 border-b border-border bg-muted/40 px-5 py-3 sm:flex">
            <p className="stamp text-muted-foreground">Producto</p>
            <div className="flex items-center gap-4">
              <p className="stamp text-muted-foreground">Cantidad</p>
              <p className="stamp w-24 text-right text-muted-foreground">Total</p>
            </div>
          </div>

          <ul className="px-5">
            {items.map((line) => (
              <CartLineRow
                key={line.itemId}
                line={line}
                onQuantityChange={handleQuantityChange}
                onRemove={handleRemove}
                disabled={isPending}
              />
            ))}
          </ul>
        </div>

        <div className="mt-6">
          <Button asChild variant="ghost" size="sm">
            <Link href="/products">← Seguir comprando</Link>
          </Button>
        </div>
      </div>

      <div className="lg:sticky lg:top-28 lg:self-start">
        <CartSummary
          subtotalCents={subtotalCents}
          totalCents={totalCents}
          itemCount={itemCount}
          currency={currency}
          pending={checkoutPending || isPending}
          error={error}
          onCheckout={handleCheckout}
        />
      </div>
    </div>
  )
}
