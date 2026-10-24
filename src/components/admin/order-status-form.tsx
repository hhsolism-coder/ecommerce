'use client'

import { useActionState, useState } from 'react'
import { updateOrderStatusAction } from '@/actions/admin/orders'
import { initialActionState } from '@/lib/action-state'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const NEXT_STATES: Record<string, string[]> = {
  PENDING: ['PAID', 'CANCELLED'],
  PAID: ['FULFILLED', 'CANCELLED'],
  FULFILLED: [],
  CANCELLED: [],
}

const LABELS: Record<string, string> = {
  PAID: 'Marcar pagado',
  FULFILLED: 'Marcar entregado',
  CANCELLED: 'Cancelar pedido',
}

export function OrderStatusForm({
  orderId,
  currentStatus,
}: {
  orderId: string
  currentStatus: string
}) {
  const [state, formAction, pending] = useActionState(updateOrderStatusAction, initialActionState)
  const options = NEXT_STATES[currentStatus] ?? []
  const [status, setStatus] = useState(options[0] ?? '')

  if (options.length === 0) {
    return <span className="text-xs text-muted-foreground">Sin transiciones disponibles</span>
  }

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <div className="flex items-center justify-end gap-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger
            className="h-8 w-40 bg-background text-xs"
            aria-label="Nuevo estado del pedido"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {LABELS[option] ?? option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" name="status" value={status} />
        <input type="hidden" name="orderId" value={orderId} />
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          Aplicar
        </Button>
      </div>

      {state.message ? (
        <span className={`text-xs ${state.ok ? 'text-success' : 'text-destructive'}`}>
          {state.message}
        </span>
      ) : null}
    </form>
  )
}
