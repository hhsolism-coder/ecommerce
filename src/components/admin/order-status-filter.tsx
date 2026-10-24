'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ALL = 'all'

export function OrderStatusFilter({ current }: { current: string }) {
  const [status, setStatus] = useState(current || ALL)

  // Un input deshabilitado no viaja en el GET: la URL queda limpia sin `status=`.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const input = event.currentTarget.elements.namedItem('status') as HTMLInputElement | null
    if (input && !input.value) input.disabled = true
  }

  return (
    <form
      action="/admin/orders"
      method="get"
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="order-status">Estado</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger id="order-status" className="h-9 w-44 bg-background">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos</SelectItem>
            <SelectItem value="PENDING">Pendiente</SelectItem>
            <SelectItem value="PAID">Pagado</SelectItem>
            <SelectItem value="FULFILLED">Entregado</SelectItem>
            <SelectItem value="CANCELLED">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        <input type="hidden" name="status" value={status === ALL ? '' : status} />
      </div>

      <Button type="submit" className="h-9">
        Filtrar
      </Button>
    </form>
  )
}
