export const MAX_ITEM_QUANTITY = 99

export type CartLine = {
  /** id de la fila CartItem (necesario para actualizar o eliminar la línea). */
  itemId?: string
  productId: string
  name: string
  /** Precio unitario en centavos, leído SIEMPRE desde la base de datos. */
  priceCents: number
  quantity: number
  stock: number
  currency?: string
}

export type CartTotals = {
  subtotalCents: number
  totalCents: number
  itemCount: number
}

/**
 * Calcula los totales del carrito a partir de las líneas con precio de base de datos.
 *
 * Es una función pura y sin I/O para poder testearla de forma aislada.
 * La cantidad efectiva se limita a [0, MAX_ITEM_QUANTITY] y el stock disponible.
 */
export function calculateCartTotals(lines: CartLine[]): CartTotals {
  let subtotalCents = 0
  let itemCount = 0

  for (const line of lines) {
    const quantity = effectiveQuantity(line.quantity, line.stock)
    if (quantity <= 0) continue
    subtotalCents += line.priceCents * quantity
    itemCount += quantity
  }

  return { subtotalCents, totalCents: subtotalCents, itemCount }
}

/**
 * Cantidad efectiva de una línea: acotada al stock disponible y al máximo por línea.
 */
export function effectiveQuantity(quantity: number, stock: number): number {
  const requested = Math.floor(Number.isFinite(quantity) ? quantity : 0)
  if (requested <= 0) return 0
  const available = Math.floor(Number.isFinite(stock) ? stock : 0)
  const capped = Math.min(requested, MAX_ITEM_QUANTITY)
  return Math.min(capped, available)
}
