'use client'

import { useState, useTransition } from 'react'
import { Check, ShoppingBag } from 'lucide-react'
import { addToCartAction } from '@/actions/cart'
import { Button } from '@/components/ui/button'

export function AddToCartButton({
  productId,
  disabled = false,
  label = 'Agregar al carrito',
  className,
}: {
  productId: string
  disabled?: boolean
  label?: string
  className?: string
}) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  function handleClick() {
    setMessage(null)
    startTransition(async () => {
      const result = await addToCartAction(productId, 1)
      if (!result.ok) {
        setMessage(result.error)
        return
      }
      setMessage('Agregado al carrito')
    })
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button
        type="button"
        onClick={handleClick}
        disabled={disabled || pending}
        className={className}
      >
        {pending ? (
          'Agregando…'
        ) : (
          <>
            {message === 'Agregado al carrito' ? (
              <Check className="size-4" />
            ) : (
              <ShoppingBag className="size-4" />
            )}
            {label}
          </>
        )}
      </Button>

      {message ? (
        <p role="status" className="text-xs text-muted-foreground">
          {message}
        </p>
      ) : null}
    </div>
  )
}
