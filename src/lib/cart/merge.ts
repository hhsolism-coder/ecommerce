export type MergeableItem = {
  productId: string
  quantity: number
}

/**
 * Fusiona dos listas de items de carrito.
 *
 * - El mismo producto suma sus cantidades.
 * - Productos distintos se agregan.
 * - Nunca se duplica una fila por producto.
 *
 * Función pura: la usa el servicio de carrito y se testea de forma aislada.
 */
export function mergeCartItems(target: MergeableItem[], source: MergeableItem[]): MergeableItem[] {
  const merged = new Map<string, number>()

  for (const item of target) {
    merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity)
  }

  for (const item of source) {
    merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity)
  }

  return [...merged.entries()].map(([productId, quantity]) => ({ productId, quantity }))
}

/**
 * Fusiona carritos y acota la cantidad resultante al stock disponible de cada producto.
 */
export function mergeCartItemsWithStock(
  target: MergeableItem[],
  source: MergeableItem[],
  stockByProduct: Map<string, number>,
): MergeableItem[] {
  return mergeCartItems(target, source).map((item) => ({
    productId: item.productId,
    quantity: Math.min(item.quantity, stockByProduct.get(item.productId) ?? 0),
  }))
}
