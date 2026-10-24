'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/guards'
import { markOrderPaid, restoreOrderStock } from '@/lib/orders'
import { updateOrderStatusSchema } from '@/lib/validation/product'
import { fieldErrorsFrom } from '@/lib/validation/errors'
import type { ActionState } from '@/lib/action-state'

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['PAID', 'CANCELLED'],
  PAID: ['FULFILLED', 'CANCELLED'],
  FULFILLED: [],
  CANCELLED: [],
}

export async function updateOrderStatusAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin('/admin/orders')

  const parsed = updateOrderStatusSchema.safeParse({
    orderId: formData.get('orderId'),
    status: formData.get('status'),
  })

  if (!parsed.success) {
    return { ok: false, message: 'Revisa los datos.', errors: fieldErrorsFrom(parsed.error) }
  }

  const { orderId, status } = parsed.data
  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) return { ok: false, message: 'El pedido no existe.' }

  const allowed = ALLOWED_TRANSITIONS[order.status] ?? []
  if (!allowed.includes(status)) {
    return {
      ok: false,
      message: `No se puede pasar de ${order.status} a ${status}.`,
    }
  }

  if (status === 'PAID') {
    // El camino manual usa la misma lógica que el webhook: registra el pago y
    // reserva el stock. Si el pago ya estaba registrado (llegó el webhook),
    // solo se alinea el estado del pedido.
    const result = await markOrderPaid(order.id)

    if (result === 'not_found') {
      return { ok: false, message: 'El pedido no existe.' }
    }
    if (result === 'insufficient_stock') {
      return {
        ok: false,
        message: 'No hay stock suficiente para marcar este pedido como pagado.',
      }
    }
    if (result === 'already_paid') {
      await prisma.order.update({ where: { id: order.id }, data: { status: 'PAID' } })
    }
  } else {
    await prisma.order.update({ where: { id: orderId }, data: { status } })

    // El stock solo se devuelve si estaba reservado, es decir, si el pedido
    // estaba pagado. Cancelar un pedido pendiente no puede inventar stock.
    if (status === 'CANCELLED' && order.status === 'PAID') {
      await restoreOrderStock(orderId)
    }
  }

  revalidatePath('/admin/orders')
  revalidatePath('/admin')

  return { ok: true, message: `Pedido ${order.orderNumber} actualizado a ${status}.` }
}
