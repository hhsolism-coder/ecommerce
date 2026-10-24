import { Badge } from '@/components/ui/badge'

const STATUS: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Pendiente', className: 'bg-caution/12 text-caution-foreground ring-1 ring-caution/25' },
  PAID: { label: 'Pagado', className: 'bg-success/12 text-success ring-1 ring-success/25' },
  FULFILLED: { label: 'Entregado', className: 'bg-primary/10 text-primary ring-1 ring-primary/20' },
  CANCELLED: { label: 'Cancelado', className: 'bg-destructive/10 text-destructive ring-1 ring-destructive/25' },
}

const PAYMENT: Record<string, { label: string; className: string }> = {
  UNPAID: { label: 'Sin pagar', className: 'bg-muted text-muted-foreground ring-1 ring-border' },
  PAID: { label: 'Pagado', className: 'bg-success/12 text-success ring-1 ring-success/25' },
  FAILED: { label: 'Fallido', className: 'bg-destructive/10 text-destructive ring-1 ring-destructive/25' },
  REFUNDED: { label: 'Reembolsado', className: 'bg-muted text-muted-foreground ring-1 ring-border' },
}

export function OrderStatusBadge({ status }: { status: string }) {
  const meta = STATUS[status] ?? { label: status, className: 'bg-muted text-muted-foreground' }

  return (
    <Badge variant="outline" className={`rounded-md px-2 py-0.5 ${meta.className}`}>
      {meta.label}
    </Badge>
  )
}

export function PaymentStatusBadge({ status }: { status: string }) {
  const meta = PAYMENT[status] ?? { label: status, className: 'bg-muted text-muted-foreground' }

  return (
    <Badge variant="outline" className={`rounded-md px-2 py-0.5 ${meta.className}`}>
      {meta.label}
    </Badge>
  )
}
